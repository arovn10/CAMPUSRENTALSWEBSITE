import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildCapitalAccount } from '@/lib/ims/capitalAccount'
import { renderStatementPdf, type StatementInfo } from '@/lib/ims/statement'
import { currentQuarterLabel } from '@/lib/ims/periods'

export const dynamic = 'force-dynamic'
// @react-pdf/renderer needs the Node runtime (not Edge).
export const runtime = 'nodejs'

/**
 * GET /api/investors/statements/download[?userId=...][&period=Q2 2026]
 *
 * Streams a branded PDF capital-account statement for the caller (or, for
 * admin/manager, any investor via ?userId). Same derivation as the portal screen.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const isAdmin = auth.role === 'ADMIN' || auth.role === 'MANAGER'
  const url = new URL(request.url)
  const requestedUserId = url.searchParams.get('userId')
  const userId = isAdmin && requestedUserId ? requestedUserId : auth.id
  const periodLabel = url.searchParams.get('period') || currentQuarterLabel()

  try {
    const [data, user] = await Promise.all([
      buildCapitalAccount(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      }),
    ])
    if (!user) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    const info: StatementInfo = {
      investorName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      investorEmail: user.email,
      periodLabel,
    }
    const pdf = await renderStatementPdf(info, data)
    const filename = `campus-rentals-statement-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`

    // NextResponse body typing accepts Uint8Array/ArrayBuffer, not Node Buffer directly.
    const body = new Uint8Array(pdf)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[statements/download] failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate statement',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
