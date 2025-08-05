import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get all entity owners with their details
    const entityOwners = await prisma.entityOwner.findMany({
      include: {
        entity: true,
        user: true
      }
    })
    
    // Get all entity investments
    const entityInvestments = await prisma.entityInvestment.findMany({
      include: {
        entity: {
          include: {
            entityOwners: {
              include: {
                user: true
              }
            }
          }
        },
        property: true
      }
    })
    
    return NextResponse.json({
      entityOwners: entityOwners.map(owner => ({
        id: owner.id,
        entityName: owner.entity.name,
        userName: `${owner.user.firstName} ${owner.user.lastName}`,
        userEmail: owner.user.email,
        ownershipPercentage: owner.ownershipPercentage,
        investmentAmount: owner.investmentAmount,
        isActive: owner.isActive
      })),
      entityInvestments: entityInvestments.map(inv => ({
        id: inv.id,
        entityName: inv.entity.name,
        propertyName: inv.property.name,
        investmentAmount: inv.investmentAmount,
        ownershipPercentage: inv.ownershipPercentage,
        owners: inv.entity.entityOwners.map(owner => ({
          userName: `${owner.user.firstName} ${owner.user.lastName}`,
          userEmail: owner.user.email,
          ownershipPercentage: owner.ownershipPercentage,
          investmentAmount: owner.investmentAmount
        }))
      }))
    })
  } catch (error) {
    console.error('Error fetching entity owners:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 