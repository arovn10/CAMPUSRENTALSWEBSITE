/**
 * Campus Rentals Instagram pipeline — configuration.
 *
 * Every switch is server-side env. Nothing here may ever carry the
 * NEXT_PUBLIC_ prefix: that would bundle the value into the browser, and two of
 * these are credentials.
 */

/** Graph API version. Pinned — Meta deprecates versions on a schedule. */
export const GRAPH_API_VERSION = 'v21.0'
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/** The Instagram Business account id (numeric, from the linked Facebook Page). */
export function igUserId(): string {
  return (process.env.IG_BUSINESS_ACCOUNT_ID ?? '').trim()
}

/** App id/secret — needed to exchange and refresh long-lived tokens. */
export function metaAppId(): string {
  return (process.env.META_APP_ID ?? '').trim()
}
export function metaAppSecret(): string {
  return (process.env.META_APP_SECRET ?? '').trim()
}

/**
 * Master switch. Publishing is OFF unless this is explicitly "true", so an
 * account misconfiguration can never result in an unintended public post.
 */
export function publishingEnabled(): boolean {
  return (process.env.SOCIAL_PUBLISHING_ENABLED ?? '').trim().toLowerCase() === 'true'
}

/** Draft generation can run (and be reviewed) with publishing still off. */
export function generationEnabled(): boolean {
  return (process.env.SOCIAL_GENERATION_ENABLED ?? 'true').trim().toLowerCase() !== 'false'
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt((process.env[name] ?? '').trim(), 10)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, raw))
}

/**
 * Publishing cadence is a ceiling of N media per rolling window of H hours.
 *
 * The default is ONE post per 168 hours — one a week. The window is rolling
 * rather than a calendar week on purpose: a calendar boundary can be crossed to
 * reset the count, so "one a week" enforced against a calendar week permits two
 * posts a few hours apart across a Sunday night. A rolling window cannot be
 * gamed that way, including by a manual workflow_dispatch.
 */
export function maxMediaPerWindow(): number {
  return intEnv('SOCIAL_MAX_MEDIA_PER_WINDOW', 1, 1, 12)
}

/** Length of that rolling window, in hours. 168 = 7 days. */
export function windowHours(): number {
  return intEnv('SOCIAL_WINDOW_HOURS', 168, 1, 720)
}

/**
 * Secondary spacing guard, in minutes. Redundant while the cap is 1 — the
 * window already enforces the gap — but it keeps spacing honest the moment
 * anyone raises the cap above 1.
 */
export function minPublishGapMinutes(): number {
  return intEnv('SOCIAL_MIN_PUBLISH_GAP_MINUTES', 1440, 30, 10080)
}

/**
 * How many drafts a generation run may leave sitting unreviewed. At one post a
 * week this is roughly six weeks of choice — enough to pick from, small enough
 * that the queue is still reviewable in one sitting.
 */
export function maxOpenDrafts(): number {
  return intEnv('SOCIAL_MAX_OPEN_DRAFTS', 6, 1, 100)
}

/**
 * Hours of publishing silence before this is worth flagging. Sized to the
 * weekly rhythm: 240h is two missed weeks, not one late afternoon.
 */
export function silentHoursWarning(): number {
  return intEnv('SOCIAL_SILENT_HOURS_WARNING', 240, 6, 2160)
}

/** True when the credentials needed to talk to Instagram are all present. */
export function instagramConfigured(): boolean {
  return Boolean(igUserId() && metaAppId() && metaAppSecret())
}
