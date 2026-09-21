/**
 * Engagement and account tracking.
 *
 * Two things are recorded, and the second one matters more:
 *   - per-media insights, snapshotted repeatedly as a post matures;
 *   - the ACCOUNT's follower count, hourly-idempotent, from day one.
 *
 * Reach is granted by the platform and can collapse for reasons no post is
 * responsible for. A follower only ever moves because a person chose. Recording
 * the follower series from the first day is what makes any later change to
 * cadence, format or copy judgeable against the outcome it was made for.
 */
import { prisma } from '@/lib/prisma'
import { mediaInsights, accountSnapshot } from './instagram'
import { instagramConfigured } from './config'

/** Media younger than this is still accumulating; older than this is settled. */
const MATURE_AFTER_HOURS = 72

export interface TrackingResult {
  mediaTracked: number
  errors: number
  followers?: number
  accountRecorded: boolean
  skipped?: string
}

/** "2026-09-21T14" — the idempotency key for one hourly account snapshot. */
export function hourKey(d = new Date()): string {
  return `${d.toISOString().slice(0, 13)}`
}

/**
 * Snapshot engagement for published media and the account itself.
 *
 * Media are re-read while they are young and then left alone: a post older than
 * MATURE_AFTER_HOURS whose numbers have already been captured after maturity
 * barely moves, and re-reading it forever spends API quota to learn nothing.
 */
export async function runTrackingCycle(): Promise<TrackingResult> {
  const result: TrackingResult = { mediaTracked: 0, errors: 0, accountRecorded: false }

  if (!instagramConfigured()) {
    result.skipped = 'Instagram credentials are not configured'
    return result
  }

  // --- the outcome metric -------------------------------------------------
  try {
    const snap = await accountSnapshot()
    const key = hourKey()
    await prisma.socialAccountSnapshot.upsert({
      where: { capturedHour: key },
      update: { followers: snap.followers, follows: snap.follows, mediaCount: snap.mediaCount },
      create: {
        igUserId: process.env.IG_BUSINESS_ACCOUNT_ID ?? '',
        followers: snap.followers,
        follows: snap.follows,
        mediaCount: snap.mediaCount,
        capturedHour: key,
      },
    })
    result.followers = snap.followers
    result.accountRecorded = true
  } catch (e) {
    console.error('[social] account snapshot failed:', e)
    result.errors += 1
  }

  // --- per-media insights -------------------------------------------------
  const cutoff = new Date(Date.now() - MATURE_AFTER_HOURS * 3_600_000)
  const posts = await prisma.socialPost.findMany({
    where: { status: 'PUBLISHED', igMediaId: { not: null } },
    select: { id: true, igMediaId: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  for (const post of posts) {
    if (!post.igMediaId) continue

    // Skip settled media that already has a post-maturity reading.
    if (post.publishedAt && post.publishedAt < cutoff) {
      const settled = await prisma.socialPostInsight.count({
        where: {
          postId: post.id,
          capturedAt: { gte: new Date(post.publishedAt.getTime() + MATURE_AFTER_HOURS * 3_600_000) },
        },
      })
      if (settled > 0) continue
    }

    try {
      const m = await mediaInsights(post.igMediaId)
      await prisma.socialPostInsight.create({
        data: {
          postId: post.id,
          igMediaId: post.igMediaId,
          reach: m.reach,
          likes: m.likes,
          comments: m.comments,
          saved: m.saved,
          shares: m.shares,
          totalInteractions: m.totalInteractions,
        },
      })
      result.mediaTracked += 1
    } catch (e) {
      console.error(`[social] insights failed for media ${post.igMediaId}:`, e)
      result.errors += 1
    }
  }

  return result
}

export interface PipelineStats {
  drafts: number
  approved: number
  published: number
  failed: number
  followers: number | null
  followersChange30d: number | null
  hoursSinceLastPublish: number | null
  /** Per-media reach, deduped by taking the max snapshot — never the sum. */
  meanReachMature: number | null
}

/** Dashboard figures for the admin review page and the health endpoint. */
export async function pipelineStats(): Promise<PipelineStats> {
  const [drafts, approved, published, failed, lastPublished, latestSnap] = await Promise.all([
    prisma.socialPost.count({ where: { status: 'DRAFT' } }),
    prisma.socialPost.count({ where: { status: 'APPROVED' } }),
    prisma.socialPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.socialPost.count({ where: { status: 'FAILED' } }),
    prisma.socialPost.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true },
    }),
    prisma.socialAccountSnapshot.findFirst({ orderBy: { capturedAt: 'desc' } }),
  ])

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)
  const oldSnap = await prisma.socialAccountSnapshot.findFirst({
    where: { capturedAt: { lte: thirtyDaysAgo } },
    orderBy: { capturedAt: 'desc' },
  })

  // Mature media only, one row per media (max reach across its snapshots).
  const matureCutoff = new Date(Date.now() - MATURE_AFTER_HOURS * 3_600_000)
  const maturePosts = await prisma.socialPost.findMany({
    where: { status: 'PUBLISHED', publishedAt: { lte: matureCutoff } },
    select: { insights: { select: { reach: true } } },
  })
  const reaches = maturePosts
    .map((p) => (p.insights.length ? Math.max(...p.insights.map((i) => i.reach)) : null))
    .filter((r): r is number => r !== null)

  return {
    drafts,
    approved,
    published,
    failed,
    followers: latestSnap?.followers ?? null,
    followersChange30d:
      latestSnap && oldSnap ? latestSnap.followers - oldSnap.followers : null,
    hoursSinceLastPublish: lastPublished?.publishedAt
      ? Math.round((Date.now() - lastPublished.publishedAt.getTime()) / 3_600_000)
      : null,
    meanReachMature: reaches.length
      ? Math.round((reaches.reduce((s, r) => s + r, 0) / reaches.length) * 10) / 10
      : null,
  }
}
