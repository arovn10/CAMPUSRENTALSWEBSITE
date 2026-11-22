import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/social/guard'
import {
  loadCredential,
  refreshIfDue,
  fingerprint,
  connectFromUserToken,
  ConnectError,
} from '@/lib/social/credentials'
import {
  instagramConfigured,
  resolveIgUserId,
  publishingEnabled,
  publishingEnvOverride,
  PUBLISHING_SETTING,
} from '@/lib/social/config'
import { setSetting } from '@/lib/social/settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function adminOnly(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  if (user.role !== 'ADMIN') return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

async function status() {
  const cred = await loadCredential()
  return {
    configured: await instagramConfigured(),
    igUserId: (await resolveIgUserId()) || null,
    igUsername: cred?.igUsername ?? null,
    pageName: cred?.pageName ?? null,
    hasToken: Boolean(cred),
    tokenFingerprint: cred ? fingerprint(cred.token) : null,
    expiresAt: cred?.expiresAt ?? null,
    daysToExpiry: cred?.daysToExpiry ?? null,
    publishingEnabled: await publishingEnabled(),
    publishingEnvOverride: publishingEnvOverride(),
  }
}

/**
 * GET /api/social/credential — connection health. ADMIN only.
 * Never returns the token itself: only a fingerprint and an expiry.
 */
export async function GET(request: NextRequest) {
  const gate = await adminOnly(request)
  if ('response' in gate) return gate.response
  try {
    return NextResponse.json(await status())
  } catch (error) {
    console.error('[social] credential read failed:', error)
    return errorResponse('Could not read credential', error)
  }
}

/**
 * POST /api/social/credential — connect Instagram. ADMIN only.
 *
 * Body: { token: string } — a long-lived Facebook *user* token for someone who
 * manages the Campus Rentals Page. The server finds the Page linked to the
 * expected Instagram account and stores that Page's (non-expiring) token,
 * encrypted. The pasted user token itself is not stored.
 */
export async function POST(request: NextRequest) {
  const gate = await adminOnly(request)
  if ('response' in gate) return gate.response
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (token.length < 30 || /\s/.test(token)) {
      return NextResponse.json({ error: 'Paste the whole access token (one line, no spaces).' }, { status: 400 })
    }
    const connected = await connectFromUserToken(token)
    console.log(`[social] Instagram connected by ${gate.user.id}`)
    return NextResponse.json({ connected: true, ...connected, status: await status() })
  } catch (error) {
    if (error instanceof ConnectError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[social] connect failed:', error)
    return errorResponse('Could not connect Instagram', error)
  }
}

/** PUT /api/social/credential — force a token refresh check now. ADMIN only. */
export async function PUT(request: NextRequest) {
  const gate = await adminOnly(request)
  if ('response' in gate) return gate.response
  try {
    return NextResponse.json(await refreshIfDue())
  } catch (error) {
    console.error('[social] credential refresh failed:', error)
    return errorResponse('Could not refresh credential', error)
  }
}

/**
 * PATCH /api/social/credential — the publishing switch. ADMIN only.
 * Body: { publishingEnabled: boolean }. SOCIAL_PUBLISHING_ENABLED in env, if
 * set, still wins — "false" there is the hard kill switch.
 */
export async function PATCH(request: NextRequest) {
  const gate = await adminOnly(request)
  if ('response' in gate) return gate.response
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.publishingEnabled !== 'boolean') {
      return NextResponse.json({ error: 'publishingEnabled (boolean) is required' }, { status: 400 })
    }
    if (body.publishingEnabled && !(await instagramConfigured())) {
      return NextResponse.json({ error: 'Connect Instagram before turning publishing on.' }, { status: 409 })
    }
    await setSetting(PUBLISHING_SETTING, body.publishingEnabled ? 'true' : 'false', gate.user.id)
    console.log(`[social] publishing switched ${body.publishingEnabled ? 'ON' : 'OFF'} by ${gate.user.id}`)
    return NextResponse.json(await status())
  } catch (error) {
    console.error('[social] publishing toggle failed:', error)
    return errorResponse('Could not change the publishing switch', error)
  }
}
