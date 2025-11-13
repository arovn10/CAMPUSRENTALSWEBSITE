import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/pipelines - Fetch all pipelines
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Only admins and managers can access CRM
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const pipelines = await prisma.dealPipeline.findMany({
      where: {
        isActive: true,
      },
      include: {
        stages: {
          where: {
            isActive: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            deals: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(pipelines);
  } catch (error: any) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipelines', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/investors/crm/pipelines - Create a new pipeline
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Only admins and managers can create pipelines
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, isDefault, stages } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Pipeline name is required' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.dealPipeline.updateMany({
        where: {
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create pipeline with stages
    const pipeline = await prisma.dealPipeline.create({
      data: {
        name,
        description,
        isDefault: isDefault || false,
        stages: {
          create: stages?.map((stage: any, index: number) => ({
            name: stage.name,
            description: stage.description,
            order: stage.order ?? index,
            color: stage.color,
          })) || [],
        },
      },
      include: {
        stages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline', details: error.message },
      { status: 500 }
    );
  }
}

