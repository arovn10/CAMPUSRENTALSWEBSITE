/**
 * Publishing: approved drafts → Instagram.
 *
 * The one path in this pipeline that makes something public, so it is the one
 * with the most gates. In order, a post publishes only if:
 *   1. SOCIAL_PUBLISHING_ENABLED is exactly "true";
 *   2. a human set its status to APPROVED;
 *   3. it has media (an editorial draft with no image never goes out);
 *   4. its caption still passes compliance — re-checked at publish time, because
 *      a reviewer may have edited the copy after it was generated;
 *   5. the rolling-24h cap and the minimum gap both allow it.
 *
 * Double-send protection: a run claims a post by moving it APPROVED →
 * PUBLISHING in a conditional update. Two concurrent runs cannot both claim the
 * same row, because the second update matches zero rows.
 */
import { prisma } from '@/lib/prisma'
import type { SocialPost } from '@prisma/client'
import { validateCaption, renderCaption } from './compliance'
import {
  createMediaContainer,
  createCarouselContainer,
  publishContainer,
  waitForContainer,
  mediaPermalink,
  publishingLimit,
  InstagramError,
} from './instagram'
import {
  maxMediaPerWindow,
  windowHours,
  minPublishGapMinutes,
  publishingEnabled,
  instagramConfigured,
} from './config'

export interface PublishOutcome {
  postId: string
  ok: boolean
  igMediaId?: string
  reason?: string
}

export interface PublishRunResult {
  attempted: number
  published: number
  blocked?: string
  outcomes: PublishOutcome[]
}

/** A listing caption advertises a dwelling, so it carries the equal-housing notice. */
function needsEqualHousingNotice(post: Pick<SocialPost, 'kind'>): boolean {
  return post.kind === 'LISTING' || post.kind === 'PHOTO_FEATURE'
}

/**
 * Cadence: how many more media may go out right now.
 *
 * Enforced against a ROLLING window (default 168h = one post a week) rather
 * than a calendar period, so the cap cannot be reset by crossing midnight or a
 * week boundary — including by a manual workflow run.
 */
export async function cadenceAllowance(now = new Date()): Promise<{
  allowed: number
  reason?: string
}> {
  const hours = windowHours()
  const since = new Date(now.getTime() - hours * 3_600_000)
  const recent = await prisma.socialPost.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gte: since } },
    select: { publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  })

  if (recent.length >= maxMediaPerWindow()) {
    const last = recent[0]?.publishedAt
    const freesAt = last ? new Date(last.getTime() + hours * 3_600_000) : null
    const hoursLeft = freesAt ? Math.ceil((freesAt.getTime() - now.getTime()) / 3_600_000) : hours
    return {
      allowed: 0,
      reason:
        `cap reached (${recent.length}/${maxMediaPerWindow()} in the last ${hours}h)` +
        (freesAt ? `; next slot in ~${hoursLeft}h` : ''),
    }
  }

  const last = recent[0]?.publishedAt
  if (last) {
    const minutesSince = (now.getTime() - last.getTime()) / 60_000
    if (minutesSince < minPublishGapMinutes()) {
      const wait = Math.ceil(minPublishGapMinutes() - minutesSince)
      return { allowed: 0, reason: `minimum gap not met (${wait} min remaining)` }
    }
  }

  return { allowed: maxMediaPerWindow() - recent.length }
}

/** Push one already-claimed post to Instagram. */
async function publishOne(post: SocialPost): Promise<PublishOutcome> {
  const caption = renderCaption(post.caption, post.hashtags, needsEqualHousingNotice(post))

  try {
    let containerId: string

    if (post.format === 'REEL') {
      containerId = await createMediaContainer({
        videoUrl: post.mediaUrls[0],
        caption,
        altText: post.altText ?? undefined,
      })
      const ready = await waitForContainer(containerId)
      if (!ready) throw new InstagramError('Reel container did not finish processing', 504)
    } else if (post.format === 'CAROUSEL') {
      const children: string[] = []
      for (const url of post.mediaUrls.slice(0, 10)) {
        children.push(await createMediaContainer({ imageUrl: url, isCarouselItem: true }))
      }
      containerId = await createCarouselContainer(children, caption)
    } else {
      containerId = await createMediaContainer({
        imageUrl: post.mediaUrls[0],
        caption,
        altText: post.altText ?? undefined,
      })
    }

    const mediaId = await publishContainer(containerId)
    const permalink = await mediaPermalink(mediaId)

    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: 'PUBLISHED',
        igMediaId: mediaId,
        igPermalink: permalink,
        publishedAt: new Date(),
        failureReason: null,
      },
    })
    return { postId: post.id, ok: true, igMediaId: mediaId }
  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 400) : 'unknown error'
    // Back to FAILED, not APPROVED: a failed publish needs a human to look at
    // it before it is retried, because the failure may be the content.
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: 'FAILED', failureReason: reason, attemptCount: { increment: 1 } },
    })
    console.error(`[social] publish failed for ${post.id}: ${reason}`)
    return { postId: post.id, ok: false, reason }
  }
}

/**
 * Publish as many approved posts as cadence allows, oldest approval first.
 * Returns a summary; never throws on a single post's failure.
 */
export async function runPublishCycle(): Promise<PublishRunResult> {
  const result: PublishRunResult = { attempted: 0, published: 0, outcomes: [] }

  if (!publishingEnabled()) {
    result.blocked = 'SOCIAL_PUBLISHING_ENABLED is not "true"'
    return result
  }
  if (!instagramConfigured()) {
    result.blocked = 'Instagram credentials are not configured'
    return result
  }

  const cadence = await cadenceAllowance()
  if (cadence.allowed === 0) {
    result.blocked = cadence.reason
    return result
  }

  // Meta's own rolling quota. Checked before claiming anything, so a quota
  // exhaustion does not strand a post in PUBLISHING.
  try {
    const limit = await publishingLimit()
    if (limit.used >= limit.cap) {
      result.blocked = `Instagram publishing quota exhausted (${limit.used}/${limit.cap})`
      return result
    }
  } catch (e) {
    console.warn('[social] could not read publishing limit, continuing:', e)
  }

  const ready = await prisma.socialPost.findMany({
    where: { status: 'APPROVED', mediaUrls: { isEmpty: false } },
    orderBy: { reviewedAt: 'asc' },
    take: cadence.allowed,
  })

  for (const post of ready) {
    // Re-validate: the reviewer may have edited the caption after generation.
    const check = validateCaption(post.caption, post.hashtags)
    if (!check.ok) {
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          failureReason: `Compliance: ${check.violations.map((v) => v.message).join(' ')}`.slice(0, 400),
        },
      })
      result.outcomes.push({ postId: post.id, ok: false, reason: 'compliance' })
      continue
    }

    // Claim it. A conditional update is the lock: a concurrent run matches zero rows.
    const claimed = await prisma.socialPost.updateMany({
      where: { id: post.id, status: 'APPROVED' },
      data: { status: 'PUBLISHING' },
    })
    if (claimed.count === 0) continue

    result.attempted += 1
    const outcome = await publishOne({ ...post, status: 'PUBLISHING' })
    result.outcomes.push(outcome)
    if (outcome.ok) result.published += 1

    // One publish per cycle keeps spacing honest even if the cron runs late.
    break
  }

  return result
}
