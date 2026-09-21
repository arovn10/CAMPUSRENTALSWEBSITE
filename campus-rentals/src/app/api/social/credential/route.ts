import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/social/guard'
import { loadCredential, saveCredential, refreshIfDue, fingerprint } from '@/lib/social/credentials'
import { instagramConfigured, igUserId } from '@/lib/social/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/social/credential — credential health. ADMIN only.
 *
 * Returns only a fingerprint and an expiry. The token itself is never returned
 * by any endpoint: it is a live credential, and an admin who needs it has it
 * already from the Meta console.
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const cred = await loadCredential()
    return NextResponse.json({
      configured: instagramConfigured(),
      igUserId: igUserId() || null,
      hasToken: Boolean(cred),
      tokenFingerprint: cred ? fingerprint(cred.token) : null,
      expiresAt: cred?.expiresAt ?? null,
      daysToExpiry: cred?.daysToExpiry ?? null,
    })
  } catch (error) {
    console.error('[social] credential read failed:', error)
    return errorResponse('Could not read credential', error)
  }
}

/**
 * POST /api/social/credential — seed or replace the stored token. ADMIN only.
 *
 * Body: { token: string, expiresInSeconds?: number }
 * The token is encrypted at rest before it touches the database.
 */
export async function POST(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (token.length < 30) {
      return NextResponse.json({ error: 'A valid long-lived token is required' }, { status: 400 })
    }
    const expiresInSeconds =
      typeof body.expiresInSeconds === 'number' && Number.isFinite(body.expiresInSeconds)
        ? body.expiresInSeconds
        : 60 * 86_400 // Meta's long-lived default

    await saveCredential({ token, igUserId: igUserId() || null, expiresInSeconds })
    console.log(`[social] Instagram credential stored by ${user.id}`)
    const cred = await loadCredential()
    return NextResponse.json({
      stored: true,
      tokenFingerprint: cred ? fingerprint(cred.token) : null,
      daysToExpiry: cred?.daysToExpiry ?? null,
    })
  } catch (error) {
    console.error('[social] credential write failed:', error)
    return errorResponse('Could not store credential', error)
  }
}

/** PUT /api/social/credential — force a refresh now. ADMIN only. */
export async function PUT(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const result = await refreshIfDue()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[social] credential refresh failed:', error)
    return errorResponse('Could not refresh credential', error)
  }
}
