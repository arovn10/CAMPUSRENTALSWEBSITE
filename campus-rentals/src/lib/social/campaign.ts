/**
 * Leasing campaigns — a fixed set of units pushed toward one move-in date.
 *
 * While a campaign is active, the generator stops drafting from the general
 * sources (every listing, rotating editorial) and instead fills three dated
 * slots a week, each tied to campaign units:
 *
 *   Mon  LISTING        one unit, full carousel, rent + specs + move-in
 *   Wed  PHOTO_FEATURE  a different unit, its stand-out detail
 *   Fri  LISTING        the lineup — cover photo of every unit still open
 *
 * Unit facts (beds, baths, rent, photos) are read LIVE from the Abodingo
 * listings feed at generation time, never copied in here, so a rent change on
 * the listing is reflected in the next draft. A unit that is no longer in the
 * feed drops out of the rotation, and its unpublished drafts are withdrawn.
 *
 * Decided by Alec, 2026-11-20: three posts a week, pre-leasing for June 1,
 * 2027, these five units.
 */

export interface CampaignUnit {
  /** Abodingo property_id under landlord `campusrentalsnola`. */
  propertyId: number
  /** Short label for logs and the review screen. */
  label: string
  /**
   * The Wednesday feature line. Taken from the listing's own description —
   * edit here if the listing copy changes. Describes the property, never the
   * tenant (fair housing: see compliance.ts).
   */
  highlight: string
  /**
   * Curated carousel, by Abodingo photoId, cover first (max 10). Chosen by
   * looking at every listing photo, 2026-11-20: street-facing exteriors lead,
   * then kitchen/living, bedrooms, baths; weak shots (utility hookups, empty
   * closets, hallways) are left out. IDs no longer on the listing are skipped;
   * if fewer than two survive, the listing's own order is used instead.
   */
  photoIds?: number[]
}

export interface Campaign {
  slug: string
  /** ISO date the leases start. */
  moveIn: string
  /** How the date is written in captions. */
  moveInLabel: string
  /** Campaign stops drafting on this date (ISO). */
  endsOn: string
  units: CampaignUnit[]
}

export const JUNE_2027_PRELEASING: Campaign = {
  slug: 'june-2027',
  moveIn: '2027-06-01',
  moveInLabel: 'June 1, 2027',
  endsOn: '2027-06-01',
  units: [
    {
      propertyId: 1,
      label: '2422 Joseph St',
      highlight: 'A 10-minute walk to campus on a quiet, well-kept block, a few streets from the Freret Street shops.',
      // cover: full house from the street
      photoIds: [18, 20, 2, 3, 9, 13, 5, 15, 17, 19],
    },
    {
      propertyId: 10,
      label: '7700 Burthe St',
      highlight: 'A fully furnished upstairs unit in a quiet, picturesque part of Uptown.',
      // cover: whole building from above. NOT the front-porch shot — its door reads "7702".
      photoIds: [43, 36, 33, 34, 32, 39, 41, 44, 40],
    },
    {
      propertyId: 6,
      label: '7315 Freret St',
      highlight: 'Fully furnished, right on the Freret corridor, with campus close by.',
      // cover: staged front exterior
      photoIds: [30, 24, 25, 28, 29, 26],
    },
    {
      propertyId: 2,
      label: '2424 Joseph St',
      highlight: 'A 10-minute walk to campus on a quiet, well-kept block, a few streets from the Freret Street shops.',
      // cover: kitchen (2422 already uses the shared facade)
      photoIds: [96, 107, 102, 100, 98, 97, 105, 103],
    },
    {
      propertyId: 11,
      label: '7702 Burthe St',
      highlight: 'New construction on the corner of Burthe and Adams — roughly 12×12 bedrooms, each with a walk-in closet.',
      // cover: front porch — the door number reads 7702
      photoIds: [166, 164, 169, 165, 163, 175, 171, 170, 167, 172],
    },
  ],
}

/** The campaign in force at `now`, or null. One campaign at a time. */
export function activeCampaign(now = new Date()): Campaign | null {
  if ((process.env.SOCIAL_CAMPAIGN_ENABLED ?? 'true').trim().toLowerCase() === 'false') return null
  const c = JUNE_2027_PRELEASING
  return now.getTime() < Date.parse(`${c.endsOn}T00:00:00Z`) ? c : null
}

export type SlotRole = 'unit' | 'feature' | 'lineup'

export interface Slot {
  role: SlotRole
  /** When the slot opens for publishing (UTC). */
  at: Date
  /** YYYY-MM-DD of `at`, used in the dedupe key. */
  day: string
  /** ISO-week number of `at`, used to rotate units. */
  week: number
}

/**
 * Publish runs at 23:30 UTC Mon/Wed/Fri (5:30pm CST / 6:30pm CDT). A slot
 * opens at 23:00 UTC so the run that day finds it due.
 */
const SLOT_HOUR_UTC = 23
const ROLE_BY_WEEKDAY: Record<number, SlotRole> = { 1: 'unit', 3: 'feature', 5: 'lineup' }

/** Drafts need time to be reviewed; a slot closer than this is not drafted for. */
const REVIEW_LEAD_HOURS = 12

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** The next `count` Mon/Wed/Fri slots at least REVIEW_LEAD_HOURS away. */
export function upcomingSlots(now = new Date(), count = 3): Slot[] {
  const earliest = now.getTime() + REVIEW_LEAD_HOURS * 3_600_000
  const out: Slot[] = []
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), SLOT_HOUR_UTC))
  for (let i = 0; i < 21 && out.length < count; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    const role = ROLE_BY_WEEKDAY[d.getUTCDay()]
    if (!role || d.getTime() < earliest) continue
    const at = new Date(d)
    out.push({ role, at, day: at.toISOString().slice(0, 10), week: isoWeek(at) })
  }
  return out
}

/**
 * Which unit a slot features, among those still listed. Monday and Wednesday
 * are offset by two so the same week never shows one unit twice.
 */
export function unitForSlot<T>(available: T[], slot: Slot): T | null {
  if (available.length === 0) return null
  const offset = slot.role === 'feature' ? 2 : 0
  return available[(slot.week + offset) % available.length]
}

/**
 * The Friday lineup lists every open unit; rotate which one leads (and so
 * supplies the cover) by week, so Fridays don't all open on the same house
 * and never repeat the cover of the posts on either side.
 */
export function rotateForLineup<T>(available: T[], slot: Slot): T[] {
  if (available.length === 0) return available
  // Mon shows unit w, Wed w+2, next Mon w+1 — so lead with w+3, which is none of them.
  const k = (slot.week + 3) % available.length
  return [...available.slice(k), ...available.slice(0, k)]
}

/** Grace after a slot before an unpublished post for it is considered stale. */
export const SLOT_STALE_HOURS = 48
