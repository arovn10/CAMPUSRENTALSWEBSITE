import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const isAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER'

/**
 * POST /api/investors/capital-calls/[id]/respond
 * Body: { action: 'ACKNOWLEDGE' | 'FUND' | 'DECLINE' }
 *
 * [id] is the capital call id. The caller acts on their OWN response row only
 * (ownership-scoped). Admin/manager may mark an investor's row funded by also
 * passing { userId } — used when recording money received outside the portal.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await request.json()
    const action = String(body?.action || '').toUpperCase()
    if (!['ACKNOWLEDGE', 'FUND', 'DECLINE'].includes(action)) {
      return NextResponse.json({ error: 'action must be ACKNOWLEDGE, FUND or DECLINE' }, { status: 400 })
    }

    // Admin may target another investor's row (e.g. to mark funded); otherwise self.
    const targetUserId = isAdmin(auth.role) && body?.userId ? String(body.userId) : auth.id

    const response = await prisma.capitalCallResponse.findUnique({
      where: { capitalCallId_userId: { capitalCallId: params.id, userId: targetUserId } },
    })
    if (!response) {
      return NextResponse.json({ error: 'No capital-call response found for this user' }, { status: 404 })
    }
    // Investors can only fund their own (admins marking funded is the record-only path).
    if (action === 'FUND' && !isAdmin(auth.role) && targetUserId !== auth.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const data: Record<string, unknown> =
      action === 'ACKNOWLEDGE'
        ? { status: 'ACKNOWLEDGED', acknowledgedAt: response.acknowledgedAt ?? now }
        : action === 'FUND'
        ? { status: 'FUNDED', fundedAt: now, acknowledgedAt: response.acknowledgedAt ?? now }
        : { status: 'DECLINED' }

    await prisma.capitalCallResponse.update({
      where: { id: response.id },
      data,
    })

    // Roll the parent call's status forward if everyone has funded.
    if (action === 'FUND') {
      const siblings = await prisma.capitalCallResponse.findMany({
        where: { capitalCallId: params.id },
        select: { status: true },
      })
      const allFunded = siblings.length > 0 && siblings.every((s) => s.status === 'FUNDED')
      const anyFunded = siblings.some((s) => s.status === 'FUNDED')
      await prisma.capitalCall.update({
        where: { id: params.id },
        data: { status: allFunded ? 'FUNDED' : anyFunded ? 'PARTIALLY_FUNDED' : 'OPEN' },
      })
    }

    return NextResponse.json({ success: true, status: data.status })
  } catch (error) {
    console.error('[capital-calls/respond] failed:', error)
    return NextResponse.json(
      { error: 'Failed to update capital-call response', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
