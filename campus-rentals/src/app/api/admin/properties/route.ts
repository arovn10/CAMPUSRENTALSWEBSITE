import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get all properties with their waterfall structures
    const properties = await prisma.property.findMany({
      include: {
        waterfallStructures: {
          include: {
            waterfallTiers: {
              where: { isActive: true },
              orderBy: { priority: 'asc' }
            }
          },
          where: { isActive: true }
        },
        entityInvestments: {
          include: {
            entity: {
              include: {
                entityOwners: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Transform the data for the admin dashboard
    const formattedProperties = properties.map(property => ({
      id: property.id,
      name: property.name,
      address: property.address,
      description: property.description || '',
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      price: property.price,
      squareFeet: property.squareFeet || 0,
      propertyType: property.propertyType,
      acquisitionDate: property.acquisitionDate?.toISOString() || null,
      acquisitionPrice: property.acquisitionPrice || 0,
      constructionCost: property.constructionCost || 0,
      totalCost: property.totalCost || 0,
      debtAmount: property.debtAmount || 0,
      debtDetails: property.debtDetails || '',
      currentValue: property.currentValue || 0,
      occupancyRate: property.occupancyRate || 0,
      monthlyRent: property.monthlyRent || 0,
      otherIncome: property.otherIncome || 0,
      annualExpenses: property.annualExpenses || 0,
      capRate: property.capRate || 0,
      waterfallStructures: property.waterfallStructures.map(structure => ({
        id: structure.id,
        name: structure.name,
        description: structure.description,
        isActive: structure.isActive,
        propertyId: structure.propertyId,
        waterfallTiers: structure.waterfallTiers.map(tier => ({
          id: tier.id,
          tierNumber: tier.tierNumber,
          tierName: tier.tierName,
          tierType: tier.tierType,
          priority: tier.priority,
          returnRate: tier.returnRate,
          catchUpPercentage: tier.catchUpPercentage,
          promotePercentage: tier.promotePercentage
        })),
        createdAt: structure.createdAt.toISOString()
      })),
      entityInvestments: property.entityInvestments.map(entityInvestment => ({
        id: entityInvestment.id,
        investmentAmount: entityInvestment.investmentAmount,
        ownershipPercentage: entityInvestment.ownershipPercentage,
        status: entityInvestment.status,
        investmentDate: entityInvestment.investmentDate.toISOString(),
        entityName: entityInvestment.entity.name,
        entityType: entityInvestment.entity.type,
        entityOwners: entityInvestment.entity.entityOwners.map(owner => ({
          id: owner.id,
          userId: owner.userId,
          userName: `${owner.user.firstName} ${owner.user.lastName}`,
          userEmail: owner.user.email,
          ownershipPercentage: owner.ownershipPercentage,
          investmentAmount: owner.investmentAmount
        }))
      }))
    }))

    return NextResponse.json(formattedProperties)
  } catch (error) {
    console.error('Error fetching properties for admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
