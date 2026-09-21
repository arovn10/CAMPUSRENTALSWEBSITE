/**
 * Caption construction for @campusrentalsllc.
 *
 * Shape of a caption, in order: a hook aimed at the reader's situation, one
 * concrete detail that could not be pasted onto a different property, the
 * practical facts (beds/baths, price, distance to campus), then a plain call to
 * action pointing at the site — never "link in bio" alone, because the site is
 * where the enquiry form lives.
 *
 * Two rules the generator must not break, both enforced downstream by
 * `compliance.validateCaption`:
 *   - never describe the ideal TENANT, only the property ("two blocks from
 *     campus", not "perfect for a single professional");
 *   - never instruct the reader to like, save, tag or share.
 */
import type { SocialPostKind } from '@prisma/client'

/** Hashtag pools, rotated per post so the account does not repeat one set. */
const HASHTAG_POOLS: Record<string, string[]> = {
  core: ['CampusRentals', 'NewOrleans', 'NOLA'],
  tulane: ['TulaneUniversity', 'TulaneHousing', 'UptownNOLA', 'LoyolaNewOrleans'],
  fau: ['FAU', 'BocaRaton', 'FAUHousing', 'OwlNation'],
  housing: ['StudentHousing', 'OffCampusHousing', 'CollegeHousing', 'ApartmentHunting'],
  neighborhood: ['UptownNewOrleans', 'FreretStreet', 'MagazineStreet', 'NOLALife'],
  development: ['MapleStreetPlaza', 'NewConstruction', 'NOLADevelopment'],
}

/**
 * Pick hashtags deterministically from a seed so the same draft always renders
 * the same tags (a reviewer approving a caption approves its tags too), while
 * different drafts get different rotations.
 */
export function pickHashtags(seed: string, pools: string[], count = 6): string[] {
  const candidates = pools.flatMap((p) => HASHTAG_POOLS[p] ?? [])
  const unique = Array.from(new Set(candidates))
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const out: string[] = []
  const pool = [...unique]
  while (out.length < Math.min(count, unique.length) && pool.length > 0) {
    h = (h * 1103515245 + 12345) >>> 0
    out.push(pool.splice(h % pool.length, 1)[0])
  }
  return out
}

/** Which hashtag pools suit a given school/kind. */
export function poolsFor(kind: SocialPostKind, school?: string | null): string[] {
  const campus = (school ?? '').toLowerCase().includes('fau') ? 'fau' : 'tulane'
  switch (kind) {
    case 'DEVELOPMENT':
      return ['core', 'development', 'neighborhood']
    case 'NEIGHBORHOOD':
      return ['core', 'neighborhood', campus]
    case 'PHOTO_FEATURE':
      return ['core', 'housing', campus]
    case 'LISTING':
    default:
      return ['core', 'housing', campus]
  }
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export interface ListingCaptionInput {
  name: string
  address: string
  bedrooms: number
  bathrooms: number
  price: number
  squareFeet?: number | null
  school?: string | null
  amenities?: string[] | null
}

/**
 * Caption for an available unit. Describes the property and the location; says
 * nothing about who should live there.
 */
export function listingCaption(p: ListingCaptionInput): string {
  const campus = (p.school ?? '').toLowerCase().includes('fau') ? 'FAU' : 'Tulane'
  const beds = p.bedrooms === 1 ? '1 bedroom' : `${p.bedrooms} bedrooms`
  const baths = p.bathrooms === 1 ? '1 bath' : `${p.bathrooms} baths`

  const lines: string[] = []
  lines.push(`Looking at housing near ${campus} for next year? ${p.address} is open.`)

  const spec = [beds, baths, p.squareFeet ? `${p.squareFeet.toLocaleString('en-US')} sq ft` : null]
    .filter(Boolean)
    .join(' · ')
  lines.push(`${spec} — ${money(p.price)}/month.`)

  const amenities = (p.amenities ?? []).filter(Boolean).slice(0, 3)
  if (amenities.length > 0) {
    lines.push(`${amenities.join(', ')}.`)
  }

  lines.push('Full photos, floor plan and availability are on the site — tour requests go straight to us.')
  return lines.join('\n\n')
}

export interface PhotoFeatureInput {
  name: string
  address: string
  highlight: string
  school?: string | null
}

/** Caption for a photo showcase of a property already in the portfolio. */
export function photoFeatureCaption(p: PhotoFeatureInput): string {
  return [
    `A closer look at ${p.address}.`,
    `${p.highlight}`,
    'More of this one, and everything else currently available, on the site.',
  ].join('\n\n')
}

export interface DevelopmentInput {
  title: string
  update: string
}

/** Caption for a Maple Street Plaza construction or design update. */
export function developmentCaption(p: DevelopmentInput): string {
  return [
    `Maple Street Plaza — ${p.title}.`,
    p.update,
    'Floor plans and the waitlist are on the site.',
  ].join('\n\n')
}

export interface NeighborhoodInput {
  title: string
  body: string
}

/** Caption for evergreen area and leasing-season content. */
export function neighborhoodCaption(p: NeighborhoodInput): string {
  return [p.title, p.body, 'We lease across Uptown New Orleans — current availability is on the site.'].join('\n\n')
}
