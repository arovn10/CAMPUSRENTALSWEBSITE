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
 * The default is THREE posts per 168 hours — Mon/Wed/Fri (Alec, 2026-11-20;
 * was one a week). The window is rolling
 * rather than a calendar week on purpose: a calendar boundary can be crossed to
 * reset the count, so "one a week" enforced against a calendar week permits two
 * posts a few hours apart across a Sunday night. A rolling window cannot be
 * gamed that way, including by a manual workflow_dispatch.
 */
export function maxMediaPerWindow(): number {
  return intEnv('SOCIAL_MAX_MEDIA_PER_WINDOW', 3, 1, 12)
}

/** Length of that rolling window, in hours. 168 = 7 days. */
export function windowHours(): number {
  return intEnv('SOCIAL_WINDOW_HOURS', 168, 1, 720)
}

/**
 * Secondary spacing guard, in minutes. With three posts a week the window
 * alone would allow all three back to back; 36h keeps them on separate slots
 * (Mon→Wed and Wed→Fri are 48h) while tolerating a late cron run.
 */
export function minPublishGapMinutes(): number {
  return intEnv('SOCIAL_MIN_PUBLISH_GAP_MINUTES', 2160, 30, 10080)
}

/**
 * How many drafts a generation run may leave sitting unreviewed. At three
 * posts a week this is three weeks of slots — reviewable in one sitting.
 */
export function maxOpenDrafts(): number {
  return intEnv('SOCIAL_MAX_OPEN_DRAFTS', 9, 1, 100)
}

/**
 * Hours of publishing silence before this is worth flagging. The longest
 * normal gap is Fri→Mon (72h); 120h means at least one slot was missed.
 */
export function silentHoursWarning(): number {
  return intEnv('SOCIAL_SILENT_HOURS_WARNING', 120, 6, 2160)
}

/** True when the credentials needed to talk to Instagram are all present. */
export function instagramConfigured(): boolean {
  return Boolean(igUserId() && metaAppId() && metaAppSecret())
}
