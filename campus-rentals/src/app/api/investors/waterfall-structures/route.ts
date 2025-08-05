import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }
    
    // Get waterfall structures for the property
    const waterfallStructures = await prisma.waterfallStructure.findMany({
      where: { 
        propertyId,
        isActive: true
      },
      include: {
        waterfallTiers: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
          include: {
            tierDistributions: {
              include: {
                entityInvestment: {
                  include: {
                    entity: true
                  }
                },
                user: true
              }
            }
          }
        },
        waterfallDistributions: {
          orderBy: { distributionDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(waterfallStructures)
  } catch (error) {
    console.error('Error fetching waterfall structures:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create waterfall structures
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Create waterfall structure with tiers
    const waterfallStructure = await prisma.$transaction(async (tx) => {
      // Create the waterfall structure
      const structure = await tx.waterfallStructure.create({
        data: {
          propertyId: body.propertyId,
          name: body.name,
          description: body.description || '',
          isActive: true
        }
      })
      
      // Create waterfall tiers
      if (body.tiers && Array.isArray(body.tiers)) {
        for (const tier of body.tiers) {
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
      }
      
      return structure
    })
    
    return NextResponse.json(waterfallStructure, { status: 201 })
  } catch (error) {
    console.error('Error creating waterfall structure:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 