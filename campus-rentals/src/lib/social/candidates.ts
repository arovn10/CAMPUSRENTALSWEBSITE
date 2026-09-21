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
} from './captions'
import { DEVELOPMENT_TOPICS, NEIGHBORHOOD_TOPICS } from './editorial'
import { maxOpenDrafts } from './config'

export interface Candidate {
  kind: SocialPostKind
  format: SocialMediaFormat
  caption: string
  hashtags: string[]
  mediaUrls: string[]
  altText?: string
  sourceKey: string
  sourceRef?: string
}

export interface GenerationResult {
  considered: number
  queued: number
  skippedDuplicate: number
  skippedCompliance: Array<{ sourceKey: string; reasons: string[] }>
  skippedNoMedia: number
  capped: boolean
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
 * Build candidates from every source and queue the new, compliant ones.
 *
 * `kinds` restricts the run to a subset of sources — used by the admin UI to
 * regenerate one kind without touching the others.
 */
export async function generateDrafts(kinds?: SocialPostKind[]): Promise<GenerationResult> {
  const want = (k: SocialPostKind) => !kinds || kinds.includes(k)

  const candidates: Candidate[] = []
  if (want('LISTING')) candidates.push(...(await listingCandidates()))
  if (want('PHOTO_FEATURE')) candidates.push(...(await photoFeatureCandidates()))
  const editorial = editorialCandidates().filter((c) => want(c.kind))
  candidates.push(...editorial)

  const result: GenerationResult = {
    considered: candidates.length,
    queued: 0,
    skippedDuplicate: 0,
    skippedCompliance: [],
    skippedNoMedia: 0,
    capped: false,
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
