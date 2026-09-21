/**
 * Shared authorisation for the social pipeline.
 *
 * Marketing content is an admin/manager surface, not an investor one, so the
 * gate is a role check rather than `canAccessProperty`. Every route calls one
 * of these; none of them trusts a caller-supplied role.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, type AuthUser } from '@/lib/auth'

/** Admin or manager may review, edit, approve and reject. */
export async function requireSocialReviewer(
  request: NextRequest
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await requireAuth(request)
  if (!user) {
    return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

/** Cron endpoints authenticate with the shared secret, not a user session. */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const provided = auth?.startsWith('Bearer ') ? auth.substring(7) : headerSecret
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** Error responses never leak internals outside development. */
export function errorResponse(message: string, error: unknown, status = 500): NextResponse {
  return NextResponse.json(
    {
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    },
    { status }
  )
}
