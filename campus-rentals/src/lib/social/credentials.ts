/**
 * Durable Instagram credential state.
 *
 * The token lives in Postgres, encrypted at rest with the app's AES helper —
 * PM2 processes cannot rewrite their own environment, so env is the wrong home
 * for anything that rotates.
 *
 * Connect flow (2026-11-22): an admin pastes a long-lived *user* token at
 * /admin/social. The server looks up the Facebook Pages that user manages,
 * finds the one linked to @campusrentalsllc, and stores that Page's access
 * token. A Page token obtained from a long-lived user token does not expire,
 * so in the normal case there is nothing to refresh. A token that does carry
 * an expiry (e.g. someone pasted a short-lived one) is refused with a message
 * saying how to extend it, rather than stored to fail an hour later.
 */
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { GRAPH_API_BASE, expectedIgUsername, metaAppIdOrDefault, metaAppId, metaAppSecret } from './config'

const PROVIDER = 'instagram'
/** Refresh when fewer than this many days remain on the token. */
const REFRESH_WHEN_DAYS_LEFT = 53
/** Meta rejects a refresh for a token younger than 24h — their rule, not ours. */
const MIN_TOKEN_AGE_HOURS = 24

export interface StoredCredential {
  token: string
  igUserId: string | null
  igUsername: string | null
  pageName: string | null
  expiresAt: Date | null
  daysToExpiry: number | null
}

/** Masked identifier for logs. A bare token in a log line is a live credential. */
export function fingerprint(token: string): string {
  if (!token) return '(empty)'
  return `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)`
}

/** Remove a token from text before it reaches a log or an API response. */
export function scrub(text: string, token: string): string {
  if (!text) return text
  let out = token ? text.split(token).join('[redacted]') : text
  // Belt and braces: the echoed copy is not guaranteed to be the same string.
  out = out.replace(/\b(?:IG|EAA)[A-Za-z0-9_-]{20,}\b/g, '[redacted]')
  return out
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/**
 * Read the stored credential. Returns null when none has been seeded yet —
 * the caller decides whether that is fatal (publishing) or merely a skip
 * (insights).
 */
export async function loadCredential(): Promise<StoredCredential | null> {
  const row = await prisma.socialCredential.findUnique({ where: { provider: PROVIDER } })
  if (!row) return null
  let token: string
  try {
    token = decrypt(row.accessToken)
  } catch {
    console.error('[social] stored Instagram token could not be decrypted — reseed it')
    return null
  }
  return {
    token,
    igUserId: row.igUserId,
    igUsername: row.igUsername,
    pageName: row.pageName,
    expiresAt: row.expiresAt,
    daysToExpiry: row.expiresAt ? daysBetween(new Date(), row.expiresAt) : null,
  }
}

/**
 * Seed or replace the stored token. Called once by an admin after the Meta
 * setup, and again by the refresh job with each rotated value.
 */
export async function saveCredential(params: {
  token: string
  igUserId?: string | null
  igUsername?: string | null
  pageName?: string | null
  /** null/undefined/0 = never expires */
  expiresInSeconds?: number | null
}): Promise<void> {
  const expiresAt = params.expiresInSeconds
    ? new Date(Date.now() + params.expiresInSeconds * 1000)
    : null
  const data = {
    accessToken: encrypt(params.token),
    igUserId: params.igUserId ?? undefined,
    igUsername: params.igUsername ?? undefined,
    pageName: params.pageName ?? undefined,
    // Explicit null when the token never expires, so a stale expiry can't linger.
    expiresAt,
    lastRefreshedAt: new Date(),
    refreshFailures: 0,
  }
  await prisma.socialCredential.upsert({
    where: { provider: PROVIDER },
    update: data,
    create: { provider: PROVIDER, ...data, accessToken: encrypt(params.token) },
  })
}

/**
 * True when the stored token is close enough to expiry to warrant a refresh.
 * A token with no expiry (the normal Page-token case) never needs one.
 */
export function refreshDue(cred: StoredCredential, lastRefreshedAt: Date | null): boolean {
  if (cred.expiresAt === null) return false
  if (lastRefreshedAt) {
    const ageHours = (Date.now() - lastRefreshedAt.getTime()) / 3_600_000
    if (ageHours < MIN_TOKEN_AGE_HOURS) return false
  }
  if (cred.daysToExpiry === null) return true
  return cred.daysToExpiry <= REFRESH_WHEN_DAYS_LEFT
}

/**
 * Exchange the stored long-lived token for a fresh 60-day one and persist it.
 * Returns the new days-to-expiry, or null when nothing was done.
 */
export async function refreshIfDue(): Promise<{ refreshed: boolean; daysToExpiry: number | null }> {
  const row = await prisma.socialCredential.findUnique({ where: { provider: PROVIDER } })
  const cred = await loadCredential()
  if (!cred || !row) return { refreshed: false, daysToExpiry: null }
  if (!refreshDue(cred, row.lastRefreshedAt)) {
    return { refreshed: false, daysToExpiry: cred.daysToExpiry }
  }

  // Facebook-login tokens are extended with fb_exchange_token, which needs the
  // app secret. Without it there is nothing safe to do — the review screen
  // shows the expiry, and reconnecting takes a minute.
  if (!metaAppId() || !metaAppSecret()) {
    return { refreshed: false, daysToExpiry: cred.daysToExpiry }
  }
  const url = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(metaAppId())}&client_secret=${encodeURIComponent(metaAppSecret())}&fb_exchange_token=${encodeURIComponent(cred.token)}`
  try {
    const res = await fetch(url, { method: 'GET' })
    const body = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!res.ok || !body.access_token) {
      await prisma.socialCredential.update({
        where: { provider: PROVIDER },
        data: { refreshFailures: { increment: 1 } },
      })
      console.error(`[social] token refresh failed (HTTP ${res.status})`)
      return { refreshed: false, daysToExpiry: cred.daysToExpiry }
    }
    await saveCredential({
      token: body.access_token,
      igUserId: cred.igUserId,
      igUsername: cred.igUsername,
      pageName: cred.pageName,
      expiresInSeconds: body.expires_in ?? null,
    })
    const days = body.expires_in ? Math.round(body.expires_in / 86_400) : null
    console.log(`[social] token refreshed, ${days ?? '?'} days to expiry`)
    return { refreshed: true, daysToExpiry: days }
  } catch (e) {
    await prisma.socialCredential.update({
      where: { provider: PROVIDER },
      data: { refreshFailures: { increment: 1 } },
    })
    console.error('[social] token refresh threw:', scrub(String(e), cred.token))
    return { refreshed: false, daysToExpiry: cred.daysToExpiry }
  }
}

// ── Connect flow ─────────────────────────────────────────────────────────────

export class ConnectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectError'
  }
}

interface PageWithIg {
  id: string
  name: string
  access_token?: string
  instagram_business_account?: { id: string; username?: string }
}

async function graphGet<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(`${GRAPH_API_BASE}/${path}?${qs}`)
  const text = await res.text()
  if (!res.ok) {
    let msg = `Meta returned HTTP ${res.status}`
    try {
      const err = (JSON.parse(text) as { error?: { message?: string } }).error
      if (err?.message) msg = scrub(err.message, token)
    } catch {
      /* keep the generic message */
    }
    throw new ConnectError(msg)
  }
  return JSON.parse(text) as T
}

/** Seconds until a token expires; null when it never does. */
async function tokenLifetimeSeconds(token: string): Promise<number | null> {
  const qs = new URLSearchParams({ client_id: metaAppIdOrDefault(), access_token: token })
  const res = await fetch(`https://graph.facebook.com/oauth/access_token_info?${qs}`)
  if (!res.ok) return null // unknown — treated as non-expiring; the publish run will surface a dead token
  const body = (await res.json()) as { expires_in?: number }
  return body.expires_in && body.expires_in > 0 ? body.expires_in : null
}

/**
 * Turn a pasted user token into a stored, non-expiring Page token for the
 * expected Instagram account. Throws ConnectError with a message fit to show
 * the admin when anything is off.
 */
export async function connectFromUserToken(userToken: string): Promise<{
  igUsername: string
  pageName: string
  igUserId: string
  expiresAt: Date | null
}> {
  const want = expectedIgUsername()
  const pages = await graphGet<{ data: PageWithIg[] }>(
    'me/accounts',
    { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '100' },
    userToken
  )
  const linked = (pages.data ?? []).filter((p) => p.instagram_business_account?.id)
  const match = linked.find((p) => (p.instagram_business_account?.username ?? '').toLowerCase() === want)
  if (!match || !match.access_token || !match.instagram_business_account) {
    const seen = linked.map((p) => `@${p.instagram_business_account?.username ?? '?'} (Page: ${p.name})`)
    throw new ConnectError(
      seen.length
        ? `No Page linked to @${want} was found. Pages with Instagram linked: ${seen.join(', ')}.`
        : `None of your Facebook Pages has an Instagram professional account linked. Link @${want} to the Campus Rentals Page first (Instagram → Settings → Account type and tools → Switch to professional / Business, then connect the Page).`
    )
  }

  const pageToken = match.access_token
  const lifetime = await tokenLifetimeSeconds(pageToken)
  if (lifetime !== null && lifetime < 7 * 86_400) {
    throw new ConnectError(
      'That token is short-lived (it expires within days). In Meta\'s Access Token Debugger, click "Extend Access Token", then paste the extended token here.'
    )
  }

  await saveCredential({
    token: pageToken,
    igUserId: match.instagram_business_account.id,
    igUsername: match.instagram_business_account.username ?? want,
    pageName: match.name,
    expiresInSeconds: lifetime,
  })
  console.log(`[social] Instagram connected: @${want} via Page "${match.name}" (${fingerprint(pageToken)})`)
  return {
    igUsername: match.instagram_business_account.username ?? want,
    pageName: match.name,
    igUserId: match.instagram_business_account.id,
    expiresAt: lifetime ? new Date(Date.now() + lifetime * 1000) : null,
  }
}
