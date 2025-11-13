import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PUT /api/investors/crm/deals/[id]/stage - Update deal stage
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { stageId, pipelineId } = body;

    if (!stageId) {
      return NextResponse.json(
        { error: 'Stage ID is required' },
        { status: 400 }
      );
    }

    // Verify stage exists and belongs to pipeline if pipelineId is provided
    if (pipelineId) {
      const stage = await prisma.dealPipelineStage.findFirst({
        where: {
          id: stageId,
          pipelineId: pipelineId,
          isActive: true,
        },
      });

      if (!stage) {
        return NextResponse.json(
          { error: 'Stage not found or does not belong to pipeline' },
          { status: 404 }
        );
      }
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        stageId,
        ...(pipelineId && { pipelineId }),
      },
      include: {
        stage: true,
        pipeline: true,
      },
    });

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error updating deal stage:', error);
    return NextResponse.json(
      { error: 'Failed to update deal stage', details: error.message },
      { status: 500 }
    );
  }
}

