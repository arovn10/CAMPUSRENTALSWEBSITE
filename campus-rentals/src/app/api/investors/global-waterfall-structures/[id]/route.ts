import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to update global waterfall structures
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    console.log('Global waterfall structure update request body:', body)
    
    // Find the global waterfall structure (propertyId = null)
    const existingStructure = await prisma.waterfallStructure.findUnique({
      where: { 
        id: params.id,
        propertyId: null // Ensure it's a global structure
      },
      include: { waterfallTiers: true }
    })
    
    if (!existingStructure) {
      console.log('Global waterfall structure not found:', params.id)
      return NextResponse.json(
        { error: 'Global waterfall structure not found' },
        { status: 404 }
      )
    }
    
    console.log('Found existing global waterfall structure:', {
      id: existingStructure.id,
      name: existingStructure.name
    })
    
    // Update the global waterfall structure and its tiers in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the global waterfall structure
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
    
    console.log('Global waterfall structure updated successfully:', result.waterfallStructure.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating global waterfall structure:', error)
    return NextResponse.json(
      { error: 'Failed to update global waterfall structure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 