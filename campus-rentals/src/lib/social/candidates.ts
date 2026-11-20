/**
 * Draft generation.
 *
 * Builds candidate posts from the four content sources and writes them to the
 * review queue as DRAFT. Nothing here publishes; nothing here can publish.
 *
 * Two invariants:
 *   1. `sourceKey` is unique and deterministic, so a re-run queues nothing
 *      twice — the generator is safe to call on any cadence.
 *   2. A candidate whose caption fails `validateCaption` is DISCARDED, not
 *      queued with a warning. The compliance gate fails closed everywhere.
 */
import { prisma } from '@/lib/prisma'
import type { SocialMediaFormat, SocialPostKind } from '@prisma/client'
import { fetchProperties, fetchPropertyPhotos, s3ToCloudFrontUrl, type Property } from '@/utils/api'
import { validateCaption } from './compliance'
import {
  listingCaption,
  photoFeatureCaption,
  developmentCaption,
  neighborhoodCaption,
  pickHashtags,
  poolsFor,
  campaignUnitCaption,
  campaignFeatureCaption,
  campaignLineupCaption,
} from './captions'
import { DEVELOPMENT_TOPICS, NEIGHBORHOOD_TOPICS } from './editorial'
import { maxOpenDrafts } from './config'
import { activeCampaign, upcomingSlots, unitForSlot, rotateForLineup, SLOT_STALE_HOURS, type Campaign } from './campaign'

export interface Candidate {
  kind: SocialPostKind
  format: SocialMediaFormat
  caption: string
  hashtags: string[]
  mediaUrls: string[]
  altText?: string
  sourceKey: string
  sourceRef?: string
  /** Campaign slot this draft is for; the publisher will not send it earlier. */
  scheduledFor?: Date
}

export interface GenerationResult {
  considered: number
  queued: number
  skippedDuplicate: number
  skippedCompliance: Array<{ sourceKey: string; reasons: string[] }>
  skippedNoMedia: number
  capped: boolean
  /** Set when a leasing campaign drove this run. */
  campaign?: string
  /** Unpublished campaign posts withdrawn (unit no longer listed, or slot passed). */
  withdrawn?: number
  /** Listing-feed facts that disagree with the campaign — fix them in Abodingo. */
  dataWarnings?: string[]
}

/** Year-week stamp, so the same listing can recur in a later week but not twice in one. */
function weekStamp(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Amenity flags on the listing payload are a comma-ish string; normalise it. */
function amenityList(p: Property): string[] {
  if (!p.amenities) return []
  return p.amenities
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
}

/** A listing is postable only if it has a price, beds and at least one photo. */
function isPostableListing(p: Property): boolean {
  return Boolean(p.price > 0 && p.bedrooms > 0 && p.address)
}

async function listingCandidates(): Promise<Candidate[]> {
  const properties = await fetchProperties().catch((e) => {
    console.error('[social] listing fetch failed:', e)
    return [] as Property[]
  })
  const week = weekStamp()
  const out: Candidate[] = []

  for (const p of properties) {
    if (!isPostableListing(p)) continue

    const photos = await fetchPropertyPhotos(p.property_id).catch(() => [])
    const urls = photos
      .slice()
      .sort((a, b) => (a.photoOrder ?? 999) - (b.photoOrder ?? 999))
      .map((ph) => s3ToCloudFrontUrl(ph.photoLink))
      .filter((u) => u.startsWith('https://'))
      .slice(0, 10)

    if (urls.length === 0) continue

    const caption = listingCaption({
      name: p.name,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      price: p.price,
      squareFeet: p.squareFeet || null,
      school: p.school,
      amenities: amenityList(p),
    })
    const sourceKey = `listing:${p.property_id}:${week}`
    out.push({
      kind: 'LISTING',
      format: urls.length >= 2 ? 'CAROUSEL' : 'IMAGE',
      caption,
      hashtags: pickHashtags(sourceKey, poolsFor('LISTING', p.school)),
      mediaUrls: urls.length >= 2 ? urls.slice(0, 10) : urls.slice(0, 1),
      altText: `${p.bedrooms} bedroom rental at ${p.address}, New Orleans`,
      sourceKey,
      sourceRef: String(p.property_id),
    })
  }
  return out
}

async function photoFeatureCandidates(): Promise<Candidate[]> {
  const properties = await fetchProperties().catch(() => [] as Property[])
  const week = weekStamp()
  const out: Candidate[] = []

  // One feature per run, rotated by week so the same property is not featured
  // every cycle. Only properties with a real photo set are eligible.
  const eligible = properties.filter((p) => p.address && p.photo)
  if (eligible.length === 0) return out

  const index = Number.parseInt(week.slice(-2), 10) % eligible.length
  const p = eligible[index]
  const photos = await fetchPropertyPhotos(p.property_id).catch(() => [])
  const urls = photos
    .slice()
    .sort((a, b) => (a.photoOrder ?? 999) - (b.photoOrder ?? 999))
    .map((ph) => s3ToCloudFrontUrl(ph.photoLink))
    .filter((u) => u.startsWith('https://'))
    .slice(0, 6)
  if (urls.length < 2) return out

  const sourceKey = `photo:${p.property_id}:${week}`
  out.push({
    kind: 'PHOTO_FEATURE',
    format: 'CAROUSEL',
    caption: photoFeatureCaption({
      name: p.name,
      address: p.address,
      highlight: `${p.bedrooms} bedrooms, ${p.bathrooms} baths, and the light these Uptown houses get in the afternoon.`,
      school: p.school,
    }),
    hashtags: pickHashtags(sourceKey, poolsFor('PHOTO_FEATURE', p.school)),
    mediaUrls: urls,
    altText: `Interior and exterior photos of ${p.address}`,
    sourceKey,
    sourceRef: String(p.property_id),
  })
  return out
}

/**
 * Editorial candidates carry no media — the reviewer attaches it. They are
 * queued so the copy is ready and waiting rather than written under time
 * pressure, and the publish path refuses any post with no media.
 */
function editorialCandidates(): Candidate[] {
  const week = weekStamp()
  const weekNum = Number.parseInt(week.slice(-2), 10)

  const dev = DEVELOPMENT_TOPICS[weekNum % DEVELOPMENT_TOPICS.length]
  const hood = NEIGHBORHOOD_TOPICS[weekNum % NEIGHBORHOOD_TOPICS.length]

  const devKey = `development:${dev.slug}:${week}`
  const hoodKey = `neighborhood:${hood.slug}:${week}`

  return [
    {
      kind: 'DEVELOPMENT' as const,
      format: 'IMAGE' as const,
      caption: developmentCaption({ title: dev.title, update: dev.body }),
      hashtags: pickHashtags(devKey, poolsFor('DEVELOPMENT')),
      mediaUrls: [],
      sourceKey: devKey,
      sourceRef: dev.slug,
    },
    {
      kind: 'NEIGHBORHOOD' as const,
      format: 'IMAGE' as const,
      caption: neighborhoodCaption({ title: hood.title, body: hood.body }),
      hashtags: pickHashtags(hoodKey, poolsFor('NEIGHBORHOOD')),
      mediaUrls: [],
      sourceKey: hoodKey,
      sourceRef: hood.slug,
    },
  ]
}

/**
 * Ordered CloudFront photo URLs for a listing. With `curated` photo IDs, those
 * photos in that order (cover first); otherwise the listing's own order.
 */
async function listingPhotoUrls(propertyId: number, max: number, curated?: number[]): Promise<string[]> {
  const photos = await fetchPropertyPhotos(propertyId).catch(() => [])
  const toUrl = (ph: (typeof photos)[number]) => s3ToCloudFrontUrl(ph.photoLink)
  const valid = (u: string) => u.startsWith('https://')

  if (curated && curated.length > 0) {
    const byId = new Map(photos.map((ph) => [ph.photoId, ph]))
    const picked = curated
      .map((id) => byId.get(id))
      .filter((ph): ph is (typeof photos)[number] => Boolean(ph))
      .map(toUrl)
      .filter(valid)
    if (picked.length >= 2) return picked.slice(0, max)
  }

  return photos
    .slice()
    .sort((a, b) => (a.photoOrder ?? 999) - (b.photoOrder ?? 999))
    .map(toUrl)
    .filter(valid)
    .slice(0, max)
}

interface CampaignBuild {
  candidates: Candidate[]
  /** Campaign units (by property id) still in the listings feed. */
  listedIds: Set<number>
  dataWarnings: string[]
}

/**
 * Drafts for the next three Mon/Wed/Fri slots of a leasing campaign. Every
 * fact in the copy comes from the live listing; the campaign only decides
 * which units, which day, and the move-in date.
 */
async function campaignCandidates(c: Campaign, now: Date): Promise<CampaignBuild> {
  const properties = await fetchProperties().catch((e) => {
    console.error('[social] listing fetch failed:', e)
    return null
  })
  // A failed fetch must not read as "every unit leased" — withdraw nothing.
  if (!properties) {
    return { candidates: [], listedIds: new Set(c.units.map((u) => u.propertyId)), dataWarnings: ['listing feed unreachable; nothing drafted'] }
  }

  const byId = new Map(properties.map((p) => [p.property_id, p]))
  const dataWarnings: string[] = []
  const available = c.units.flatMap((u) => {
    const p = byId.get(u.propertyId)
    if (!p) return []
    if (!isPostableListing(p)) {
      dataWarnings.push(`${u.label}: listing is missing price, beds or address — skipped`)
      return []
    }
    const terms = (p.leaseTerms ?? '').slice(0, 10)
    if (terms !== c.moveIn) {
      dataWarnings.push(`${u.label}: listing says available ${terms || '(blank)'}, campaign says ${c.moveIn}`)
    }
    return [{ unit: u, p }]
  })
  const listedIds = new Set(available.map((a) => a.unit.propertyId))

  const candidates: Candidate[] = []
  for (const slot of upcomingSlots(now)) {
    const base = `campaign:${c.slug}:${slot.role}:${slot.day}`

    if (slot.role === 'lineup') {
      if (available.length < 2) continue // a carousel needs two images; Monday covers a lone unit
      const lineup = rotateForLineup(available, slot)
      const covers: string[] = []
      for (const a of lineup) {
        const [cover] = await listingPhotoUrls(a.p.property_id, 1, a.unit.photoIds)
        if (cover) covers.push(cover)
      }
      if (covers.length < 2) continue
      candidates.push({
        kind: 'LISTING',
        format: 'CAROUSEL',
        caption: campaignLineupCaption(
          lineup.map((a) => ({ address: a.unit.label, bedrooms: a.p.bedrooms, bathrooms: a.p.bathrooms, price: a.p.price })),
          c.moveInLabel,
          slot.week,
        ),
        hashtags: pickHashtags(base, poolsFor('LISTING', 'Tulane University')),
        mediaUrls: covers.slice(0, 10),
        altText: `Exterior photos of ${available.length} homes near Tulane available ${c.moveInLabel}`,
        sourceKey: base,
        sourceRef: available.map((a) => a.p.property_id).join(','),
        scheduledFor: slot.at,
      })
      continue
    }

    const pick = unitForSlot(available, slot)
    if (!pick) continue
    const { unit, p } = pick
    const urls = await listingPhotoUrls(p.property_id, slot.role === 'feature' ? 6 : 10, unit.photoIds)
    if (urls.length === 0) continue
    const sourceKey = `${base}:${p.property_id}`

    if (slot.role === 'unit') {
      candidates.push({
        kind: 'LISTING',
        format: urls.length >= 2 ? 'CAROUSEL' : 'IMAGE',
        caption: campaignUnitCaption({
          name: p.name,
          address: unit.label,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          price: p.price,
          squareFeet: p.squareFeet || null,
          school: p.school,
          moveInLabel: c.moveInLabel,
        }),
        hashtags: pickHashtags(sourceKey, poolsFor('LISTING', p.school)),
        mediaUrls: urls,
        altText: `${p.bedrooms} bedroom rental at ${unit.label}, New Orleans`,
        sourceKey,
        sourceRef: String(p.property_id),
        scheduledFor: slot.at,
      })
    } else {
      if (urls.length < 2) continue
      candidates.push({
        kind: 'PHOTO_FEATURE',
        format: 'CAROUSEL',
        caption: campaignFeatureCaption({ address: unit.label, highlight: unit.highlight, moveInLabel: c.moveInLabel }),
        hashtags: pickHashtags(sourceKey, poolsFor('PHOTO_FEATURE', p.school)),
        mediaUrls: urls,
        altText: `Interior and exterior photos of ${unit.label}, New Orleans`,
        sourceKey,
        sourceRef: String(p.property_id),
        scheduledFor: slot.at,
      })
    }
  }

  return { candidates, listedIds, dataWarnings }
}

/**
 * Withdraw unpublished campaign posts that should no longer go out: the unit
 * left the listings feed (leased), or the slot passed without publishing.
 * Withdrawn posts become REJECTED with the reason, so the queue says why.
 */
async function withdrawStaleCampaignPosts(c: Campaign, listedIds: Set<number>, now: Date): Promise<number> {
  const open = await prisma.socialPost.findMany({
    where: { status: { in: ['DRAFT', 'APPROVED'] }, sourceKey: { startsWith: `campaign:${c.slug}:` } },
    select: { id: true, sourceRef: true, scheduledFor: true },
  })
  const staleBefore = now.getTime() - SLOT_STALE_HOURS * 3_600_000
  let withdrawn = 0
  for (const post of open) {
    const ids = (post.sourceRef ?? '').split(',').map(Number).filter(Number.isFinite)
    const goneUnit = ids.length === 1 && !listedIds.has(ids[0])
    const lapsed = post.scheduledFor !== null && post.scheduledFor.getTime() < staleBefore
    if (!goneUnit && !lapsed) continue
    const res = await prisma.socialPost.updateMany({
      where: { id: post.id, status: { in: ['DRAFT', 'APPROVED'] } },
      data: {
        status: 'REJECTED',
        rejectionReason: goneUnit
          ? 'Withdrawn automatically: unit is no longer listed (leased or unpublished).'
          : 'Withdrawn automatically: its campaign slot passed without publishing.',
      },
    })
    withdrawn += res.count
  }
  return withdrawn
}

/**
 * Build candidates from every source and queue the new, compliant ones.
 *
 * While a leasing campaign is active, the campaign is the only source: it
 * fills dated Mon/Wed/Fri slots and the general sources are paused so they
 * cannot crowd the review queue.
 *
 * `kinds` restricts the run to a subset of sources — used by the admin UI to
 * regenerate one kind without touching the others.
 */
export async function generateDrafts(kinds?: SocialPostKind[]): Promise<GenerationResult> {
  const want = (k: SocialPostKind) => !kinds || kinds.includes(k)

  const now = new Date()
  const campaign = activeCampaign(now)
  const candidates: Candidate[] = []
  let withdrawn: number | undefined
  let dataWarnings: string[] | undefined

  if (campaign) {
    const build = await campaignCandidates(campaign, now)
    candidates.push(...build.candidates.filter((c) => want(c.kind)))
    withdrawn = await withdrawStaleCampaignPosts(campaign, build.listedIds, now)
    dataWarnings = build.dataWarnings
  } else {
    if (want('LISTING')) candidates.push(...(await listingCandidates()))
    if (want('PHOTO_FEATURE')) candidates.push(...(await photoFeatureCandidates()))
    candidates.push(...editorialCandidates().filter((c) => want(c.kind)))
  }

  const result: GenerationResult = {
    considered: candidates.length,
    queued: 0,
    skippedDuplicate: 0,
    skippedCompliance: [],
    skippedNoMedia: 0,
    capped: false,
    ...(campaign ? { campaign: campaign.slug, withdrawn, dataWarnings } : {}),
  }

  const openDrafts = await prisma.socialPost.count({ where: { status: 'DRAFT' } })
  let room = Math.max(0, maxOpenDrafts() - openDrafts)
  if (room === 0) {
    result.capped = true
    return result
  }

  for (const c of candidates) {
    if (room === 0) {
      result.capped = true
      break
    }

    const check = validateCaption(c.caption, c.hashtags)
    if (!check.ok) {
      result.skippedCompliance.push({
        sourceKey: c.sourceKey,
        reasons: check.violations.map((v) => `${v.code}${v.match ? ` (${v.match})` : ''}`),
      })
      continue
    }

    try {
      await prisma.socialPost.create({
        data: {
          kind: c.kind,
          format: c.format,
          status: 'DRAFT',
          caption: c.caption,
          hashtags: c.hashtags,
          mediaUrls: c.mediaUrls,
          altText: c.altText ?? null,
          sourceKey: c.sourceKey,
          sourceRef: c.sourceRef ?? null,
          scheduledFor: c.scheduledFor ?? null,
        },
      })
      result.queued += 1
      room -= 1
    } catch (e) {
      // Unique violation on sourceKey = already queued. Any other error is real.
      if (e instanceof Error && e.message.includes('Unique constraint')) {
        result.skippedDuplicate += 1
      } else {
        console.error(`[social] could not queue ${c.sourceKey}:`, e)
      }
    }
  }

  return result
}
