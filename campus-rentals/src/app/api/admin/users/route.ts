import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        propertyAccess: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(users)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role = 'INVESTOR', password } = body
    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    const created = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        password: hashed,
        emailVerified: true
      }
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

