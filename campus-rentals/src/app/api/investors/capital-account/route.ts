import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { buildCapitalAccount } from '@/lib/ims/capitalAccount'

export const dynamic = 'force-dynamic'

/**
 * GET /api/investors/capital-account[?userId=...]
 *
 * Returns the caller's derived capital account(s) + consolidated rollup +
 * institutional metric set (XIRR/MOIC/TVPI/DPI/RVPI/CoC). Derivation lives in
 * src/lib/ims/capitalAccount.ts so the screen and the PDF statement agree.
 *
 * Admin/manager may pass ?userId to view any investor; others see only themselves.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const isAdmin = auth.role === 'ADMIN' || auth.role === 'MANAGER'
  const requestedUserId = new URL(request.url).searchParams.get('userId')
  const userId = isAdmin && requestedUserId ? requestedUserId : auth.id

  try {
    const payload = await buildCapitalAccount(userId)
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[capital-account] failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to build capital account',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
