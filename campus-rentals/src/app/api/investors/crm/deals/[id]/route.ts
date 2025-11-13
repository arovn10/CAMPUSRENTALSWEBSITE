import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/deals/[id] - Fetch a single deal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        pipeline: {
          include: {
            stages: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        stage: true,
        property: {
          include: {
            photos: {
              take: 1,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        notes: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        relationships: {
          include: {
            contact: true,
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
        dealTags: true,
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/investors/crm/deals/[id] - Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      dealType,
      status,
      priority,
      pipelineId,
      stageId,
      propertyId,
      description,
      location,
      estimatedValue,
      estimatedCloseDate,
      actualCloseDate,
      source,
      assignedToId,
      tags,
      metadata,
    } = body;

    // Update deal
    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(dealType !== undefined && { dealType }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(pipelineId !== undefined && { pipelineId }),
        ...(stageId !== undefined && { stageId }),
        ...(propertyId !== undefined && { propertyId }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(estimatedValue !== undefined && { estimatedValue }),
        ...(estimatedCloseDate !== undefined && {
          estimatedCloseDate: estimatedCloseDate ? new Date(estimatedCloseDate) : null,
        }),
        ...(actualCloseDate !== undefined && {
          actualCloseDate: actualCloseDate ? new Date(actualCloseDate) : null,
        }),
        ...(source !== undefined && { source }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(tags !== undefined && { tags }),
        ...(metadata !== undefined && { metadata }),
      },
      include: {
        pipeline: true,
        stage: true,
        property: {
          select: {
            id: true,
            propertyId: true,
            name: true,
            address: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        dealTags: true,
      },
    });

    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await prisma.dealTag.deleteMany({
        where: { dealId: params.id },
      });

      // Create new tags
      if (tags.length > 0) {
        await prisma.dealTag.createMany({
          data: tags.map((tag: string) => ({
            dealId: params.id,
            tag,
          })),
        });
      }
    }

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: 'Failed to update deal', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/deals/[id] - Delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.deal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal', details: error.message },
      { status: 500 }
    );
  }
}

