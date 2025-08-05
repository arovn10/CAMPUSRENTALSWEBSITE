import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { waterfallStructureId, entityInvestmentId } = body
    
    // Get the waterfall structure
    const waterfallStructure = await prisma.waterfallStructure.findUnique({
      where: { id: waterfallStructureId },
      include: {
        waterfallTiers: {
          where: { isActive: true },
          orderBy: { priority: 'asc' }
        }
      }
    })
    
    if (!waterfallStructure) {
      return NextResponse.json(
        { error: 'Waterfall structure not found' },
        { status: 404 }
      )
    }
    
    // Get the entity investment
    const entityInvestment = await prisma.entityInvestment.findUnique({
      where: { id: entityInvestmentId },
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
    })
    
    if (!entityInvestment) {
      return NextResponse.json(
        { error: 'Entity investment not found' },
        { status: 404 }
      )
    }
    
    // Create a new property-specific waterfall structure based on the global one
    const newWaterfallStructure = await prisma.$transaction(async (tx) => {
      const structure = await tx.waterfallStructure.create({
        data: {
          propertyId: entityInvestment.propertyId,
          name: `${waterfallStructure.name} - ${entityInvestment.entity.name}`,
          description: `Applied from global structure: ${waterfallStructure.description || ''}`,
          isActive: true
        }
      })
      
      // Copy all tiers from the global structure
      for (const tier of waterfallStructure.waterfallTiers) {
        await tx.waterfallTier.create({
          data: {
            waterfallStructureId: structure.id,
            tierNumber: tier.tierNumber,
            tierName: tier.tierName,
            tierType: tier.tierType,
            priority: tier.priority,
            returnRate: tier.returnRate,
            catchUpPercentage: tier.catchUpPercentage,
            promotePercentage: tier.promotePercentage,
            isActive: true
          }
        })
      }
      
      return structure
    })
    
    return NextResponse.json({
      message: 'Waterfall structure applied successfully',
      waterfallStructure: newWaterfallStructure
    }, { status: 201 })
  } catch (error) {
    console.error('Error applying waterfall structure:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 