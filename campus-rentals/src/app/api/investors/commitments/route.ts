import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const isAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER'

/**
 * GET /api/investors/commitments[?userId=]
 * Investor sees their own commitments; admin/manager may target any investor or
 * (with no userId) see all.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const requested = new URL(request.url).searchParams.get('userId')
  const where = isAdmin(auth.role)
    ? requested
      ? { userId: requested }
      : {}
    : { userId: auth.id }

  const commitments = await prisma.commitment.findMany({
    where,
    orderBy: { committedAt: 'desc' },
    include: { property: { select: { id: true, name: true } }, entity: { select: { id: true, name: true } } },
  })

  const rows = commitments.map((c) => ({
    id: c.id,
    userId: c.userId,
    amount: Number(c.amount),
    committedAt: c.committedAt,
    status: c.status,
    note: c.note,
    dealName: c.property?.name ?? c.entity?.name ?? null,
    propertyId: c.propertyId,
    entityId: c.entityId,
  }))
  const totalCommitted = rows.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + r.amount, 0)

  return NextResponse.json({ commitments: rows, totalCommitted }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * POST /api/investors/commitments  (ADMIN/MANAGER)
 * Body: { userId, amount, propertyId?, entityId?, note? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const userId = String(body?.userId || '')
    const amount = Number(body?.amount)
    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'userId and a positive amount are required' }, { status: 400 })
    }
    const commitment = await prisma.commitment.create({
      data: {
        userId,
        amount,
        propertyId: body?.propertyId ? String(body.propertyId) : null,
        entityId: body?.entityId ? String(body.entityId) : null,
        note: body?.note ? String(body.note) : null,
      },
    })
    return NextResponse.json({ success: true, id: commitment.id })
  } catch (error) {
    console.error('[commitments] failed:', error)
    return NextResponse.json(
      { error: 'Failed to create commitment', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
