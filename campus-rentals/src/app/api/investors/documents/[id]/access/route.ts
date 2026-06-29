import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const isAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER'

/**
 * GET /api/investors/documents/[id]/access   (ADMIN/MANAGER)
 * Returns the per-investor access grants AND the view audit trail for a document.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [grants, views] = await Promise.all([
    prisma.documentAccess.findMany({
      where: { documentId: params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.documentView.findMany({
      where: { documentId: params.id },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { viewedAt: 'desc' },
      take: 200,
    }),
  ])

  return NextResponse.json(
    {
      grants: grants.map((g) => ({
        id: g.id,
        userId: g.userId,
        investor: `${g.user?.firstName ?? ''} ${g.user?.lastName ?? ''}`.trim() || g.user?.email,
        createdAt: g.createdAt,
      })),
      views: views.map((v) => ({
        investor: `${v.user?.firstName ?? ''} ${v.user?.lastName ?? ''}`.trim() || v.user?.email,
        viewedAt: v.viewedAt,
        ipAddress: v.ipAddress,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * POST /api/investors/documents/[id]/access   (ADMIN/MANAGER)
 * Grant or revoke a per-investor access grant (auto-routing).
 * Body: { userId, action?: 'GRANT' | 'REVOKE' }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const userId = String(body?.userId || '')
    const action = String(body?.action || 'GRANT').toUpperCase()
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    if (action === 'REVOKE') {
      await prisma.documentAccess.deleteMany({ where: { documentId: params.id, userId } })
      return NextResponse.json({ success: true, granted: false })
    }

    await prisma.documentAccess.upsert({
      where: { documentId_userId: { documentId: params.id, userId } },
      update: {},
      create: { documentId: params.id, userId, grantedBy: auth.id },
    })
    return NextResponse.json({ success: true, granted: true })
  } catch (error) {
    console.error('[document access] failed:', error)
    return NextResponse.json(
      { error: 'Failed to update access', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
