/**
 * Durable Instagram credential state.
 *
 * The Lightsail box runs the app under PM2 and the process cannot rewrite its
 * own environment, so a rotating long-lived token cannot live in env alone —
 * it would revert on every restart. The token therefore lives in Postgres,
 * encrypted at rest with the app's existing AES helper.
 *
 * A long-lived Instagram token lasts 60 days and is refreshable any time after
 * it is 24 hours old. We refresh weekly, which leaves ~8 consecutive failures
 * of headroom before anything is actually at risk.
 */
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { GRAPH_API_BASE } from './config'

const PROVIDER = 'instagram'
/** Refresh when fewer than this many days remain on the token. */
const REFRESH_WHEN_DAYS_LEFT = 53
/** Meta rejects a refresh for a token younger than 24h — their rule, not ours. */
const MIN_TOKEN_AGE_HOURS = 24

export interface StoredCredential {
  token: string
  igUserId: string | null
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
  expiresInSeconds?: number | null
}): Promise<void> {
  const expiresAt = params.expiresInSeconds
    ? new Date(Date.now() + params.expiresInSeconds * 1000)
    : null
  const data = {
    accessToken: encrypt(params.token),
    igUserId: params.igUserId ?? undefined,
    expiresAt: expiresAt ?? undefined,
    lastRefreshedAt: new Date(),
    refreshFailures: 0,
  }
  await prisma.socialCredential.upsert({
    where: { provider: PROVIDER },
    update: data,
    create: { provider: PROVIDER, ...data, accessToken: encrypt(params.token) },
  })
}

/** True when the stored token is close enough to expiry to warrant a refresh. */
export function refreshDue(cred: StoredCredential, lastRefreshedAt: Date | null): boolean {
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

  const url = `${GRAPH_API_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(cred.token)}`
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
