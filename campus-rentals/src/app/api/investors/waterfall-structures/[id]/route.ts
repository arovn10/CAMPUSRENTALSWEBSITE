import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to update waterfall structures
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    console.log('Waterfall structure update request body:', body)
    
    // Find the waterfall structure
    const existingStructure = await prisma.waterfallStructure.findUnique({
      where: { id: params.id },
      include: { waterfallTiers: true }
    })
    
    if (!existingStructure) {
      console.log('Waterfall structure not found:', params.id)
      return NextResponse.json(
        { error: 'Waterfall structure not found' },
        { status: 404 }
      )
    }
    
    console.log('Found existing waterfall structure:', {
      id: existingStructure.id,
      name: existingStructure.name,
      propertyId: existingStructure.propertyId
    })
    
    // Update the waterfall structure and its tiers in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the waterfall structure
      const waterfallStructure = await tx.waterfallStructure.update({
        where: { id: params.id },
        data: {
          name: body.name,
          description: body.description
        }
      })
      
      // Delete existing tiers
      await tx.waterfallTier.deleteMany({
        where: { waterfallStructureId: params.id }
      })
      
      // Create new tiers
      const waterfallTiers = []
      for (const tier of body.tiers) {
        const waterfallTier = await tx.waterfallTier.create({
          data: {
            waterfallStructureId: params.id,
            tierNumber: tier.tierNumber,
            tierName: tier.tierName,
            tierType: tier.tierType,
            priority: tier.priority,
            returnRate: tier.returnRate,
            catchUpPercentage: tier.catchUpPercentage,
            promotePercentage: tier.promotePercentage
          }
        })
        waterfallTiers.push(waterfallTier)
      }
      
      return { waterfallStructure, waterfallTiers }
    })
    
    console.log('Waterfall structure updated successfully:', result.waterfallStructure.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating waterfall structure:', error)
    return NextResponse.json(
      { error: 'Failed to update waterfall structure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 