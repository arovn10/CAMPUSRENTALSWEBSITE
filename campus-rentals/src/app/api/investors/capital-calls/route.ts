import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCapitalCallEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER'

/**
 * GET /api/investors/capital-calls
 * Investor sees calls where they have a response row; admin/manager see all calls
 * with every response.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (isAdmin(auth.role)) {
    const calls = await prisma.capitalCall.findMany({
      orderBy: { issuedAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        responses: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    })
    return NextResponse.json({ calls: calls.map(serializeAdminCall) }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Investor view: only their own response rows.
  const responses = await prisma.capitalCallResponse.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: 'desc' },
    include: {
      capitalCall: { include: { property: { select: { name: true } }, entity: { select: { name: true } } } },
    },
  })
  const calls = responses.map((r) => ({
    responseId: r.id,
    capitalCallId: r.capitalCallId,
    dealName: r.capitalCall.property?.name ?? r.capitalCall.entity?.name ?? 'Investment',
    amountCalled: Number(r.amountCalled),
    status: r.status,
    dueDate: r.capitalCall.dueDate,
    issuedAt: r.capitalCall.issuedAt,
    description: r.capitalCall.description,
    acknowledgedAt: r.acknowledgedAt,
    fundedAt: r.fundedAt,
  }))
  return NextResponse.json({ calls }, { headers: { 'Cache-Control': 'no-store' } })
}

function serializeAdminCall(c: any) {
  return {
    id: c.id,
    dealName: c.property?.name ?? c.entity?.name ?? null,
    propertyId: c.propertyId,
    entityId: c.entityId,
    callNumber: c.callNumber,
    totalAmount: Number(c.totalAmount),
    description: c.description,
    dueDate: c.dueDate,
    issuedAt: c.issuedAt,
    status: c.status,
    responses: c.responses.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      investor: `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || r.user?.email,
      amountCalled: Number(r.amountCalled),
      status: r.status,
      acknowledgedAt: r.acknowledgedAt,
      fundedAt: r.fundedAt,
    })),
  }
}

/**
 * POST /api/investors/capital-calls  (ADMIN/MANAGER)
 * Issues a capital call and creates per-investor response rows + emails them.
 * Body: {
 *   propertyId?, entityId?, callNumber?, description?, dueDate?,
 *   allocations: [{ userId, amountCalled }]   // one per investor in the call
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const allocations: Array<{ userId: string; amountCalled: number }> = Array.isArray(body?.allocations)
      ? body.allocations
          .map((a: any) => ({ userId: String(a?.userId || ''), amountCalled: Number(a?.amountCalled) }))
          .filter((a: any) => a.userId && Number.isFinite(a.amountCalled) && a.amountCalled > 0)
      : []
    if (allocations.length === 0) {
      return NextResponse.json({ error: 'At least one valid allocation { userId, amountCalled } is required' }, { status: 400 })
    }
    const totalAmount = allocations.reduce((s, a) => s + a.amountCalled, 0)

    const call = await prisma.capitalCall.create({
      data: {
        propertyId: body?.propertyId ? String(body.propertyId) : null,
        entityId: body?.entityId ? String(body.entityId) : null,
        callNumber: Number.isFinite(Number(body?.callNumber)) ? Number(body.callNumber) : null,
        description: body?.description ? String(body.description) : null,
        dueDate: body?.dueDate ? new Date(body.dueDate) : null,
        totalAmount,
        createdBy: auth.id,
        responses: { create: allocations.map((a) => ({ userId: a.userId, amountCalled: a.amountCalled })) },
      },
      include: {
        property: { select: { name: true } },
        entity: { select: { name: true } },
        responses: { include: { user: { select: { firstName: true, email: true } } } },
      },
    })

    const dealName = call.property?.name ?? call.entity?.name ?? 'your investment'
    // Notify each investor + in-app notification. Failures are non-fatal.
    await Promise.all(
      call.responses.map(async (r) => {
        try {
          await prisma.notification.create({
            data: {
              userId: r.userId,
              title: 'Capital call issued',
              message: `A capital call of $${Number(r.amountCalled).toLocaleString()} was issued for ${dealName}.`,
              type: 'SYSTEM',
            },
          })
          if (r.user?.email) {
            await sendCapitalCallEmail(r.user.email, {
              investorName: r.user.firstName ?? undefined,
              dealName,
              amountCalled: Number(r.amountCalled),
              dueDate: call.dueDate,
            })
          }
        } catch (e) {
          console.error('[capital-calls] notify failed for', r.userId, e)
        }
      })
    )

    return NextResponse.json({ success: true, id: call.id, totalAmount, investors: call.responses.length })
  } catch (error) {
    console.error('[capital-calls] failed:', error)
    return NextResponse.json(
      { error: 'Failed to issue capital call', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
