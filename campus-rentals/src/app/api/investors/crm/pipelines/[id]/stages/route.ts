import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/pipelines/[id]/stages - Create a new stage
export async function POST(
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
    const { name, description, order, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Stage name is required' },
        { status: 400 }
      );
    }

    const stage = await prisma.dealPipelineStage.create({
      data: {
        pipelineId: params.id,
        name,
        description,
        order: order ?? 0,
        color,
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating stage:', error);
    return NextResponse.json(
      { error: 'Failed to create stage', details: error.message },
      { status: 500 }
    );
  }
}

