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

/**
 * The Instagram Business account id from env, if set. Normally empty: the id is
 * discovered and stored when an admin connects the account at /admin/social.
 * Use resolveIgUserId() — it falls back to the stored value.
 */
export function igUserId(): string {
  return (process.env.IG_BUSINESS_ACCOUNT_ID ?? '').trim()
}

/** The Instagram username the connect flow must find (guards against connecting the wrong account). */
export function expectedIgUsername(): string {
  return (process.env.SOCIAL_IG_USERNAME ?? 'campusrentalsllc').trim().replace(/^@/, '').toLowerCase()
}

/**
 * Meta app id. Public (it appears in every OAuth URL), so a default is safe;
 * env overrides it. Only used to ask Meta how long a token lives.
 */
export function metaAppIdOrDefault(): string {
  return metaAppId() || '1827015521939730' // "Campus Rentals Social", created 2026-11-22
}

/** App id/secret — needed to exchange and refresh long-lived tokens. */
export function metaAppId(): string {
  return (process.env.META_APP_ID ?? '').trim()
}
export function metaAppSecret(): string {
  return (process.env.META_APP_SECRET ?? '').trim()
}

/**
 * Master switch. Publishing is OFF unless something explicitly turns it on, so
 * an account misconfiguration can never result in an unintended public post.
 *
 *   SOCIAL_PUBLISHING_ENABLED=false  → off, whatever the admin toggle says (hard kill)
 *   SOCIAL_PUBLISHING_ENABLED=true   → on
 *   unset                            → the admin toggle at /admin/social decides (default off)
 */
export async function publishingEnabled(): Promise<boolean> {
  const env = (process.env.SOCIAL_PUBLISHING_ENABLED ?? '').trim().toLowerCase()
  if (env === 'false') return false
  if (env === 'true') return true
  const { getSetting } = await import('./settings')
  return (await getSetting(PUBLISHING_SETTING)) === 'true'
}

export const PUBLISHING_SETTING = 'publishing_enabled'

/** Where the switch is being decided — shown on the review screen. */
export function publishingEnvOverride(): 'on' | 'off' | null {
  const env = (process.env.SOCIAL_PUBLISHING_ENABLED ?? '').trim().toLowerCase()
  return env === 'true' ? 'on' : env === 'false' ? 'off' : null
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
 * The default allows FOUR posts per 168 hours: the three Mon/Wed/Fri slots
 * (Alec, 2026-11-20) plus room for one hand-made post a week (2026-11-22).
 * The slots themselves still produce three. The window is rolling
 * rather than a calendar week on purpose: a calendar boundary can be crossed to
 * reset the count, so "one a week" enforced against a calendar week permits two
 * posts a few hours apart across a Sunday night. A rolling window cannot be
 * gamed that way, including by a manual workflow_dispatch.
 */
export function maxMediaPerWindow(): number {
  return intEnv('SOCIAL_MAX_MEDIA_PER_WINDOW', 4, 1, 12)
}

/** Length of that rolling window, in hours. 168 = 7 days. */
export function windowHours(): number {
  return intEnv('SOCIAL_WINDOW_HOURS', 168, 1, 720)
}

/**
 * Secondary spacing guard, in minutes. 12h stops a double post from a
 * re-run while leaving room for one hand-made post between slots (2026-11-22).
 */
export function minPublishGapMinutes(): number {
  return intEnv('SOCIAL_MIN_PUBLISH_GAP_MINUTES', 720, 30, 10080)
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

/** The Instagram account id to publish to: env first, else the one stored at connect time. */
export async function resolveIgUserId(): Promise<string> {
  const fromEnv = igUserId()
  if (fromEnv) return fromEnv
  const { loadCredential } = await import('./credentials')
  return (await loadCredential())?.igUserId ?? ''
}

/** True when a token and an Instagram account id are both available. */
export async function instagramConfigured(): Promise<boolean> {
  const { loadCredential } = await import('./credentials')
  const cred = await loadCredential()
  return Boolean(cred && (igUserId() || cred.igUserId))
}
