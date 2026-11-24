import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertOwnershipSum,
  parseOwnershipPercentage,
} from '@/lib/ownershipValidation'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    // Exposes all entity owners + their percentages — admin/manager only.
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all entity owners with full details
    const entityOwners = await prisma.entityOwner.findMany({
      include: {
        entity: true,
        user: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(entityOwners)
  } catch (error) {
    console.error('Error fetching entity owners:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Check if user has permission to create entity owners
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    if (!body.entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 })
    }

    let ownershipPercentage: number
    try {
      ownershipPercentage = parseOwnershipPercentage(body.ownershipPercentage, { required: true }) as number
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid ownership' }, { status: 400 })
    }

    const existing = await prisma.entityOwner.findMany({
      where: { entityId: body.entityId, isActive: true },
      select: { ownershipPercentage: true },
    })
    const nextSum =
      existing.reduce((s, o) => s + Number(o.ownershipPercentage ?? 0), 0) + ownershipPercentage
    try {
      assertOwnershipSum(nextSum, 'Entity owner')
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Ownership sum invalid' }, { status: 400 })
    }

    const entityOwner = await prisma.entityOwner.create({
      data: {
        entityId: body.entityId,
        userId: body.userId || null,
        investorEntityId: body.investorEntityId || null,
        ownershipPercentage,
        investmentAmount: body.investmentAmount != null ? Number(body.investmentAmount) : 0,
      },
      include: {
        entity: true,
        user: true
      }
    })
    
    return NextResponse.json(entityOwner, { status: 201 })
  } catch (error) {
    console.error('Error creating entity owner:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined },
      { status: 500 }
    )
  }
} 