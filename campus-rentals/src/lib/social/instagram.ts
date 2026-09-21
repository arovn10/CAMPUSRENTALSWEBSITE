/**
 * Instagram Graph API client for @campusrentalsllc.
 *
 * Publishing is a two-step protocol: create a media *container* (Instagram
 * fetches the media from a public URL and processes it), then publish that
 * container by id. A carousel is three steps — a container per child, then a
 * parent container listing them, then the publish.
 *
 * Every media URL handed to Instagram must be publicly reachable: Meta's
 * servers fetch it, not the browser. Ours are CloudFront URLs, which is why the
 * pipeline only ever posts media already on the CDN.
 */
import { GRAPH_API_BASE, igUserId } from './config'
import { loadCredential, scrub } from './credentials'

export class InstagramError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'InstagramError'
    this.status = status
  }
}

async function graph<T>(
  path: string,
  params: Record<string, string>,
  method: 'GET' | 'POST' = 'GET'
): Promise<T> {
  const cred = await loadCredential()
  if (!cred) throw new InstagramError('No Instagram credential stored', 503)

  const search = new URLSearchParams({ ...params, access_token: cred.token })
  const url = method === 'GET' ? `${GRAPH_API_BASE}/${path}?${search}` : `${GRAPH_API_BASE}/${path}`
  const res = await fetch(url, {
    method,
    body: method === 'POST' ? search : undefined,
    headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
  })

  const text = await res.text()
  if (!res.ok) {
    // Meta echoes request parameters in some errors — scrub before it reaches a log.
    throw new InstagramError(scrub(text, cred.token).slice(0, 500), res.status)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new InstagramError('Instagram returned a non-JSON response', 502)
  }
}

/** Create a single-image or Reel container. Returns the container id. */
export async function createMediaContainer(params: {
  imageUrl?: string
  videoUrl?: string
  caption?: string
  isCarouselItem?: boolean
  altText?: string
}): Promise<string> {
  const body: Record<string, string> = {}
  if (params.videoUrl) {
    body.media_type = 'REELS'
    body.video_url = params.videoUrl
  } else if (params.imageUrl) {
    body.image_url = params.imageUrl
  } else {
    throw new InstagramError('createMediaContainer needs an imageUrl or a videoUrl', 400)
  }
  if (params.isCarouselItem) body.is_carousel_item = 'true'
  // A carousel CHILD must not carry a caption; the parent owns it.
  if (params.caption && !params.isCarouselItem) body.caption = params.caption
  if (params.altText) body.alt_text = params.altText

  const out = await graph<{ id: string }>(`${igUserId()}/media`, body, 'POST')
  return out.id
}

/** Create the parent container for a carousel of already-created children. */
export async function createCarouselContainer(childIds: string[], caption: string): Promise<string> {
  if (childIds.length < 2 || childIds.length > 10) {
    throw new InstagramError(`A carousel needs 2-10 items, got ${childIds.length}`, 400)
  }
  const out = await graph<{ id: string }>(
    `${igUserId()}/media`,
    { media_type: 'CAROUSEL', children: childIds.join(','), caption },
    'POST'
  )
  return out.id
}

/**
 * Container processing status. Video containers are not publishable the instant
 * they are created — Instagram transcodes first, and publishing an IN_PROGRESS
 * container fails.
 */
export async function containerStatus(containerId: string): Promise<{
  status: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
  error?: string
}> {
  const out = await graph<{ status_code: string; status?: string }>(containerId, {
    fields: 'status_code,status',
  })
  return {
    status: (out.status_code as 'FINISHED') ?? 'IN_PROGRESS',
    error: out.status,
  }
}

/** Wait for a container to finish processing. Returns false on timeout/error. */
export async function waitForContainer(
  containerId: string,
  { timeoutMs = 120_000, intervalMs = 5_000 } = {}
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { status } = await containerStatus(containerId)
    if (status === 'FINISHED') return true
    if (status === 'ERROR' || status === 'EXPIRED') return false
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

/** Publish a finished container. Returns the published media id. */
export async function publishContainer(containerId: string): Promise<string> {
  const out = await graph<{ id: string }>(
    `${igUserId()}/media_publish`,
    { creation_id: containerId },
    'POST'
  )
  return out.id
}

/** Permalink for a published media, for the review UI to link to. */
export async function mediaPermalink(mediaId: string): Promise<string | null> {
  try {
    const out = await graph<{ permalink?: string }>(mediaId, { fields: 'permalink' })
    return out.permalink ?? null
  } catch {
    return null
  }
}

export interface MediaInsights {
  reach: number
  likes: number
  comments: number
  saved: number
  shares: number
  totalInteractions: number
}

/**
 * Engagement for one published media. Metrics Instagram declines to compute for
 * a given media type come back absent; absent is recorded as 0, which is safe
 * because a metric that is genuinely zero and one that is missing are only
 * distinguishable by the API returning the key at all — and we record the
 * snapshot either way so the series stays continuous.
 */
export async function mediaInsights(mediaId: string): Promise<MediaInsights> {
  const metrics = 'reach,likes,comments,saved,shares,total_interactions'
  const out = await graph<{ data?: Array<{ name: string; values?: Array<{ value: number }> }> }>(
    `${mediaId}/insights`,
    { metric: metrics }
  )
  const byName = new Map<string, number>()
  for (const row of out.data ?? []) {
    byName.set(row.name, row.values?.[0]?.value ?? 0)
  }
  return {
    reach: byName.get('reach') ?? 0,
    likes: byName.get('likes') ?? 0,
    comments: byName.get('comments') ?? 0,
    saved: byName.get('saved') ?? 0,
    shares: byName.get('shares') ?? 0,
    totalInteractions: byName.get('total_interactions') ?? 0,
  }
}

/** Account-level counts. This is the outcome metric — followers. */
export async function accountSnapshot(): Promise<{
  followers: number
  follows: number
  mediaCount: number
}> {
  const out = await graph<{
    followers_count?: number
    follows_count?: number
    media_count?: number
  }>(igUserId(), { fields: 'followers_count,follows_count,media_count' })
  return {
    followers: out.followers_count ?? 0,
    follows: out.follows_count ?? 0,
    mediaCount: out.media_count ?? 0,
  }
}

/** Quota used in the rolling 24h publishing window (Meta's cap is 50). */
export async function publishingLimit(): Promise<{ used: number; cap: number }> {
  const out = await graph<{ data?: Array<{ quota_usage?: number; config?: { quota_total?: number } }> }>(
    `${igUserId()}/content_publishing_limit`,
    { fields: 'config,quota_usage' }
  )
  const row = out.data?.[0]
  return { used: row?.quota_usage ?? 0, cap: row?.config?.quota_total ?? 50 }
}
