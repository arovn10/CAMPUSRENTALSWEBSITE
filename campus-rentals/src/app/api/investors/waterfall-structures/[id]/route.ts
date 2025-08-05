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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to delete waterfall structures
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    console.log('Attempting to delete waterfall structure:', params.id)
    
    // Check if the waterfall structure exists
    const existingStructure = await prisma.waterfallStructure.findUnique({
      where: { id: params.id },
      include: { 
        waterfallTiers: true,
        waterfallDistributions: true
      }
    })
    
    if (!existingStructure) {
      console.log('Waterfall structure not found:', params.id)
      return NextResponse.json(
        { error: 'Waterfall structure not found' },
        { status: 404 }
      )
    }
    
    console.log('Found waterfall structure to delete:', {
      id: existingStructure.id,
      name: existingStructure.name,
      tiersCount: existingStructure.waterfallTiers.length,
      distributionsCount: existingStructure.waterfallDistributions.length
    })
    
    // Check if there are any distributions using this structure
    if (existingStructure.waterfallDistributions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete waterfall structure that has distributions. Please delete all distributions first.' },
        { status: 400 }
      )
    }
    
    // Delete the waterfall structure and its tiers in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete tiers first (due to foreign key constraints)
      await tx.waterfallTier.deleteMany({
        where: { waterfallStructureId: params.id }
      })
      
      // Delete the waterfall structure
      await tx.waterfallStructure.delete({
        where: { id: params.id }
      })
    })
    
    console.log('Waterfall structure deleted successfully:', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting waterfall structure:', error)
    return NextResponse.json(
      { error: 'Failed to delete waterfall structure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 