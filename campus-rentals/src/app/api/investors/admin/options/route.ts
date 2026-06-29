import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/investors/admin/options   (ADMIN/MANAGER)
 * Lightweight option lists for admin IMS forms: investors and properties (deals).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [users, properties] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.property.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return NextResponse.json(
    {
      investors: users.map((u) => ({
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        email: u.email,
        role: u.role,
      })),
      properties: properties.map((p) => ({ id: p.id, name: p.name, address: p.address })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
