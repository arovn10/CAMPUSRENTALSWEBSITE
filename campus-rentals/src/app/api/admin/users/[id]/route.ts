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

// Contact/address fields an admin or manager may edit on an investor record.
// NEVER add role, email, password, or permission fields here.
const ALLOWED_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'company',
  'address',
  'city',
  'state',
  'zipCode',
  'country',
  'mailingAddress',
  'mailingCity',
  'mailingState',
  'mailingZipCode',
  'mailingCountry',
] as const

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const { propertyIds } = body as { propertyIds?: string[] }

    // Whitelisted profile field updates (additive to the propertyIds behavior below)
    const profileData: Record<string, any> = {}
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (body[key] !== undefined) profileData[key] = body[key]
    }

    if (propertyIds === undefined && Object.keys(profileData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    if (propertyIds !== undefined) {
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
    }

    if (Object.keys(profileData).length > 0) {
      await prisma.user.update({ where: { id: params.id }, data: profileData })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

