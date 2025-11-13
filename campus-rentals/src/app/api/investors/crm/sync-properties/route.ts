import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/investors/crm/sync-properties - Automatically sync properties to deals
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get or create default pipeline
    let defaultPipeline = await prisma.dealPipeline.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!defaultPipeline) {
      defaultPipeline = await prisma.dealPipeline.create({
        data: {
          name: 'Default Pipeline',
          description: 'Default pipeline for all deals',
          isDefault: true,
          stages: {
            create: [
              { name: 'New', order: 0, color: '#3B82F6' },
              { name: 'In Progress', order: 1, color: '#F59E0B' },
              { name: 'Closed', order: 2, color: '#10B981' },
            ],
          },
        },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      })
    }

    // Fetch all active properties
    const properties = await prisma.property.findMany({
      where: {
        isActive: true,
      },
    })

    const syncedDeals = []
    const createdDeals = []
    const updatedDeals = []

    for (const property of properties) {
      try {
        // Check if deal already exists for this property
        const existingDeal = await prisma.deal.findFirst({
          where: {
            propertyId: property.id,
          },
        })

        // Determine deal type and section based on deal status
        let dealType = 'ACQUISITION'
        let section = 'ACQUISITION'
        
        if (property.dealStatus === 'UNDER_CONSTRUCTION') {
          dealType = 'DEVELOPMENT'
          section = 'DEVELOPMENT'
        } else if (property.dealStatus === 'STABILIZED' || property.dealStatus === 'SOLD') {
          section = 'ASSET_MANAGEMENT'
        }

        // Determine priority
        let priority = 'MEDIUM'
        if (property.fundingStatus === 'FUNDING') {
          priority = 'HIGH'
        }

        const location = property.address
          ? property.address.split(',').slice(-2).join(',').trim()
          : null

        const statusString = property.dealStatus ? String(property.dealStatus) : 'STABILIZED'

        if (existingDeal) {
          // Update existing deal
          const updated = await prisma.deal.update({
            where: { id: existingDeal.id },
            data: {
              name: property.name,
              dealType: dealType as any,
              status: statusString,
              priority: priority as any,
              description: property.description || undefined,
              location: location || undefined,
              estimatedValue: property.currentValue || property.totalCost || undefined,
              actualCloseDate: property.dealStatus === 'SOLD' ? property.acquisitionDate : undefined,
              section: section,
              budgetedCost: property.totalCost || undefined,
              actualCost: property.totalCost || undefined,
              occupancyRate: property.occupancyRate || undefined,
              noi: property.otherIncome && property.annualExpenses 
                ? (property.otherIncome * 12) - property.annualExpenses 
                : undefined,
              capRate: property.capRate || undefined,
            },
          })
          updatedDeals.push(updated)
          syncedDeals.push(updated)
        } else {
          // Create new deal
          const deal = await prisma.deal.create({
            data: {
              name: property.name,
              dealType: dealType as any,
              status: statusString,
              priority: priority as any,
              pipelineId: defaultPipeline.id,
              stageId: defaultPipeline.stages[0]?.id,
              propertyId: property.id,
              description: property.description || undefined,
              location: location || undefined,
              estimatedValue: property.currentValue || property.totalCost || undefined,
              estimatedCloseDate: property.acquisitionDate || undefined,
              actualCloseDate: property.dealStatus === 'SOLD' ? property.acquisitionDate : undefined,
              source: 'Synced from Properties',
              tags: property.dealStatus ? [String(property.dealStatus)] : [],
              section: section,
              budgetedCost: property.totalCost || undefined,
              actualCost: property.totalCost || undefined,
              occupancyRate: property.occupancyRate || undefined,
              noi: property.otherIncome && property.annualExpenses 
                ? (property.otherIncome * 12) - property.annualExpenses 
                : undefined,
              capRate: property.capRate || undefined,
            },
          })
          createdDeals.push(deal)
          syncedDeals.push(deal)
        }
      } catch (error: any) {
        console.error(`Error syncing property ${property.id} (${property.name}):`, error)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedDeals.length,
      created: createdDeals.length,
      updated: updatedDeals.length,
      message: `Synced ${syncedDeals.length} deals (${createdDeals.length} created, ${updatedDeals.length} updated)`,
    })
  } catch (error: any) {
    console.error('Error syncing properties:', error)
    return NextResponse.json(
      { error: 'Failed to sync properties', details: error.message },
      { status: 500 }
    )
  }
}

