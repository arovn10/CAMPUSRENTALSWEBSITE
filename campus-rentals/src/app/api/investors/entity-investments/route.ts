import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get all entity investments with full details
    const entityInvestments = await prisma.entityInvestment.findMany({
      include: {
        entity: {
          include: {
            entityOwners: {
              include: {
                user: true,
                investorEntity: true
              }
            }
          }
        },
        entityInvestmentOwners: { include: { user: true, investorEntity: true } },
        property: true,
        entityDistributions: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(entityInvestments)
  } catch (error) {
    console.error('Error fetching entity investments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create entity investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Create entity investment with multiple owners
    const result = await prisma.$transaction(async (tx) => {
      // Create the entity investment
      const entityInvestment = await tx.entityInvestment.create({
        data: {
          entityId: body.entityId,
          propertyId: body.propertyId,
          investmentAmount: body.investmentAmount,
          ownershipPercentage: body.ownershipPercentage,
          status: body.status || 'ACTIVE'
        }
      })
      
      // Create entity owners (multiple investors) - optional
      const entityOwners = []
      if (body.owners && Array.isArray(body.owners)) {
        for (const owner of body.owners) {
          const entityOwner = await tx.entityOwner.create({
            data: {
              entityId: body.entityId,
              userId: owner.userId,
              ownershipPercentage: owner.ownershipPercentage,
              investmentAmount: owner.investmentAmount
            }
          })
          entityOwners.push(entityOwner)
        }
      }
      
      return { entityInvestment, entityOwners }
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating entity investment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 