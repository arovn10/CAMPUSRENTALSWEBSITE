/**
 * Shared authorisation for the social pipeline.
 *
 * Marketing content is an admin/manager surface, not an investor one, so the
 * gate is a role check rather than `canAccessProperty`. Every route calls one
 * of these; none of them trusts a caller-supplied role.
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createPublicKey, type JsonWebKey as NodeJwk } from 'crypto'
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

const GITHUB_ISSUER = 'https://token.actions.githubusercontent.com'
/** Audience the workflow requests; a token minted for anything else is refused. */
export const CRON_OIDC_AUDIENCE = 'campusrentalsllc-social'
const ALLOWED_REPO = 'arovn10/campusrentalswebsite'
const ALLOWED_WORKFLOW = '.github/workflows/social-pipeline.yml'

let jwksCache: { at: number; keys: Array<Record<string, string>> } | null = null

async function githubJwks(): Promise<Array<Record<string, string>>> {
  if (jwksCache && Date.now() - jwksCache.at < 3_600_000) return jwksCache.keys
  const res = await fetch(`${GITHUB_ISSUER}/.well-known/jwks`)
  if (!res.ok) throw new Error(`JWKS fetch failed: HTTP ${res.status}`)
  const body = (await res.json()) as { keys: Array<Record<string, string>> }
  jwksCache = { at: Date.now(), keys: body.keys }
  return body.keys
}

/**
 * Verify a GitHub Actions OIDC token: signed by GitHub, minted for our
 * audience, from this repo's main branch, by the social pipeline workflow.
 * This replaces a shared CRON_SECRET — there is no secret to copy anywhere.
 */
async function verifyGithubOidc(token: string): Promise<boolean> {
  const decoded = jwt.decode(token, { complete: true })
  const kid = decoded && typeof decoded === 'object' ? decoded.header.kid : undefined
  if (!kid) return false
  const jwk = (await githubJwks()).find((k) => k.kid === kid)
  if (!jwk) return false
  const key = createPublicKey({ key: jwk as unknown as NodeJwk, format: 'jwk' })
  try {
    const claims = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: GITHUB_ISSUER,
      audience: CRON_OIDC_AUDIENCE,
    }) as Record<string, unknown>
    const repo = String(claims.repository ?? '').toLowerCase()
    const ref = String(claims.ref ?? '')
    const workflowRef = String(claims.workflow_ref ?? '').toLowerCase()
    return repo === ALLOWED_REPO && ref === 'refs/heads/main' && workflowRef.includes(ALLOWED_WORKFLOW)
  } catch {
    return false
  }
}

/**
 * Cron endpoints accept either a GitHub Actions OIDC token from the social
 * pipeline workflow (the normal path — nothing to configure), or the legacy
 * shared CRON_SECRET if one is set.
 */
export async function requireCronSecret(request: NextRequest): Promise<NextResponse | null> {
  const auth = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const provided = auth?.startsWith('Bearer ') ? auth.substring(7) : headerSecret
  if (!provided) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = process.env.CRON_SECRET
  if (secret && provided === secret) return null

  if (provided.split('.').length === 3) {
    try {
      if (await verifyGithubOidc(provided)) return null
    } catch (e) {
      console.error('[social] OIDC verification error:', e)
      return NextResponse.json({ error: 'Could not verify caller' }, { status: 503 })
    }
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
