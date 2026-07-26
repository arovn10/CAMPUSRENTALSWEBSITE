import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Investor-portal middleware.
 *
 * Scoped to /investors/* only (never touches the public marketing site or the
 * Abodingo listings pages). It applies baseline security headers as defense-in-depth.
 *
 * NOTE on auth gating: we deliberately do NOT hard-redirect based on the httpOnly
 * auth cookie here. Existing sessions authenticate via a sessionStorage Bearer
 * token (no cookie until their next login), so cookie-required redirects would
 * lock them out. Auth is enforced server-side in every API route via
 * requireAuth() (Bearer header OR cookie) and client-side by the investor layout.
 * Once all clients have re-logged-in (cookie present), this can be upgraded to a
 * hard redirect for unauthenticated, non-public /investors routes.
 */
export function middleware(_request: NextRequest) {
  const res = NextResponse.next()
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  // Keep the private portal out of search results. The investors layout is a client
  // component so it cannot export `metadata` — the header is the reliable route.
  // (Until 2026-07-23 /investors/login served `robots: index, follow`.)
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

export const config = {
  matcher: ['/investors/:path*'],
}
