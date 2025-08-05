import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    const waterfallStructures = await prisma.waterfallStructure.findMany({
      where: { 
        isActive: true,
        propertyId: null // Global structures don't have a propertyId
      },
      include: {
        waterfallTiers: {
          where: { isActive: true },
          orderBy: { priority: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(waterfallStructures)
  } catch (error) {
    console.error('Error fetching global waterfall structures:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    
    const waterfallStructure = await prisma.$transaction(async (tx) => {
      const structure = await tx.waterfallStructure.create({
        data: {
          propertyId: null, // Global structure
          name: body.name,
          description: body.description || '',
          isActive: true
        }
      })
      
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
    console.error('Error creating global waterfall structure:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 