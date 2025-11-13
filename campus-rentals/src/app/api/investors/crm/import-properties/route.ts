import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/import-properties - Import all properties as deals
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pipelineId, stageId } = body;

    // Get default pipeline if not provided
    let targetPipelineId = pipelineId;
    let targetStageId = stageId;

    if (!targetPipelineId) {
      const defaultPipeline = await prisma.dealPipeline.findFirst({
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
      });

      if (!defaultPipeline) {
        // Create a default pipeline if none exists
        const newPipeline = await prisma.dealPipeline.create({
          data: {
            name: 'Default Pipeline',
            description: 'Default pipeline for imported properties',
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
        });
        targetPipelineId = newPipeline.id;
        targetStageId = newPipeline.stages[0]?.id;
      } else {
        targetPipelineId = defaultPipeline.id;
        targetStageId = targetStageId || defaultPipeline.stages[0]?.id;
      }
    }

    // Fetch all properties
    const properties = await prisma.property.findMany({
      where: {
        isActive: true,
      },
      include: {
        investments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        entityInvestments: {
          include: {
            entity: true,
          },
        },
      },
    });

    const importedDeals = [];
    const skippedDeals = [];
    const errors = [];

    for (const property of properties) {
      try {
      // Check if deal already exists for this property
      const existingDeal = await prisma.deal.findFirst({
        where: {
          propertyId: property.id,
        },
      });

      if (existingDeal) {
        skippedDeals.push({
          propertyId: property.id,
          propertyName: property.name,
          reason: 'Deal already exists',
        });
        continue;
      }

      // Determine deal type based on deal status
      let dealType = 'ACQUISITION';
      if (property.dealStatus === 'UNDER_CONSTRUCTION') {
        dealType = 'DEVELOPMENT';
      } else if (property.dealStatus === 'SOLD') {
        dealType = 'DISPOSITION';
      }

      // Determine priority based on funding status
      let priority = 'MEDIUM';
      if (property.fundingStatus === 'FUNDING') {
        priority = 'HIGH';
      }

      // Get location from address
      const location = property.address
        ? property.address.split(',').slice(-2).join(',').trim() // Get city, state
        : null;

      // Convert enum to string for status field
      const statusString = property.dealStatus ? String(property.dealStatus) : 'STABILIZED';

      // Create deal
      const deal = await prisma.deal.create({
        data: {
          name: property.name,
          dealType: dealType as any,
          status: statusString,
          priority: priority as any,
          pipelineId: targetPipelineId || undefined,
          stageId: targetStageId || undefined,
          propertyId: property.id,
          description: property.description || undefined,
          location: location || undefined,
          estimatedValue: property.currentValue || property.totalCost || undefined,
          estimatedCloseDate: property.acquisitionDate || undefined,
          actualCloseDate: property.dealStatus === 'SOLD' ? property.acquisitionDate : undefined,
          source: 'Imported from Properties',
          tags: property.dealStatus ? [String(property.dealStatus)] : [],
        },
        include: {
          property: {
            select: {
              id: true,
              propertyId: true,
              name: true,
              address: true,
            },
          },
        },
      });

        importedDeals.push(deal);
      } catch (error: any) {
        console.error(`Error importing property ${property.id} (${property.name}):`, error);
        errors.push({
          propertyId: property.id,
          propertyName: property.name,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedDeals.length,
      skipped: skippedDeals.length,
      errors: errors.length,
      importedDeals: importedDeals.map((d) => ({
        id: d.id,
        name: d.name,
        propertyId: d.propertyId,
      })),
      skippedDeals,
      errorDetails: errors,
    });
  } catch (error: any) {
    console.error('Error importing properties:', error);
    return NextResponse.json(
      { error: 'Failed to import properties', details: error.message },
      { status: 500 }
    );
  }
}

