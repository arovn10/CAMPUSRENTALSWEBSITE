import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const isAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER'

/** GET /api/investors/announcements — recent announcements (ADMIN/MANAGER history). */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { author: { select: { firstName: true, lastName: true } } },
  })
  return NextResponse.json(
    {
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        propertyId: a.propertyId,
        recipientCount: a.recipientCount,
        createdAt: a.createdAt,
        author: `${a.author?.firstName ?? ''} ${a.author?.lastName ?? ''}`.trim(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * POST /api/investors/announcements  (ADMIN/MANAGER)
 * Broadcast an announcement. Body: { title, body, propertyId? }
 *  - propertyId null  → all active investors
 *  - propertyId set   → only investors with access to that deal
 * Fans out to in-app Notification rows; records recipient count.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const title = String(body?.title || '').trim()
    const message = String(body?.body || '').trim()
    const propertyId = body?.propertyId ? String(body.propertyId) : null
    if (!title || !message) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
    }

    // Resolve recipients.
    let userIds: string[]
    if (propertyId) {
      const [investments, access, ownerStakes] = await Promise.all([
        prisma.investment.findMany({ where: { propertyId }, select: { userId: true } }),
        prisma.userPropertyAccess.findMany({ where: { propertyId }, select: { userId: true } }),
        prisma.entityOwner.findMany({
          where: { userId: { not: null }, entity: { entityInvestments: { some: { propertyId } } } },
          select: { userId: true },
        }),
      ])
      userIds = Array.from(
        new Set([
          ...investments.map((i) => i.userId),
          ...access.map((a) => a.userId),
          ...ownerStakes.map((o) => o.userId).filter((v): v is string => !!v),
        ])
      )
    } else {
      const investors = await prisma.user.findMany({
        where: { isActive: true, role: { in: ['INVESTOR', 'MANAGER'] } },
        select: { id: true },
      })
      userIds = investors.map((u) => u.id)
    }

    const announcement = await prisma.announcement.create({
      data: { title, body: message, propertyId, createdBy: auth.id, recipientCount: userIds.length },
    })

    if (userIds.length > 0) {
      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title,
          message,
          type: 'SYSTEM' as const,
        })),
      })
    }

    return NextResponse.json({ success: true, id: announcement.id, recipients: userIds.length })
  } catch (error) {
    console.error('[announcements] failed:', error)
    return NextResponse.json(
      { error: 'Failed to broadcast announcement', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
