import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
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
    
    // Check if user has permission to create entity owners
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Create entity owner
    const entityOwner = await prisma.entityOwner.create({
      data: {
        entityId: body.entityId,
        userId: body.userId,
        ownershipPercentage: body.ownershipPercentage,
        investmentAmount: body.investmentAmount
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
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 