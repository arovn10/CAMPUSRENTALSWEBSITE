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

/** Ceiling on published media per rolling 24h. Deliberately small. */
export function maxMediaPerDay(): number {
  return intEnv('SOCIAL_MAX_MEDIA_PER_DAY', 2, 1, 12)
}

/** Minimum spacing between publishes, in minutes. */
export function minPublishGapMinutes(): number {
  return intEnv('SOCIAL_MIN_PUBLISH_GAP_MINUTES', 240, 30, 1440)
}

/** How many drafts a generation run may leave sitting unreviewed. */
export function maxOpenDrafts(): number {
  return intEnv('SOCIAL_MAX_OPEN_DRAFTS', 12, 1, 100)
}

/** Hours of publishing silence before /api/health flags it. */
export function silentHoursWarning(): number {
  return intEnv('SOCIAL_SILENT_HOURS_WARNING', 72, 6, 720)
}

/** True when the credentials needed to talk to Instagram are all present. */
export function instagramConfigured(): boolean {
  return Boolean(igUserId() && metaAppId() && metaAppSecret())
}
