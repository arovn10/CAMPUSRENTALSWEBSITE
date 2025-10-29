import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const { propertyIds } = body as { propertyIds: string[] }
    if (!Array.isArray(propertyIds)) {
      return NextResponse.json({ error: 'propertyIds must be an array' }, { status: 400 })
    }

    // Reset and set new access entries
    await prisma.userPropertyAccess.deleteMany({ where: { userId: params.id } })
    if (propertyIds.length > 0) {
      await prisma.userPropertyAccess.createMany({
        data: propertyIds.map(pid => ({ userId: params.id, propertyId: pid })),
        skipDuplicates: true
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

