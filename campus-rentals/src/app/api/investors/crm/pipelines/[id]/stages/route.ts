import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
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

    const stageId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(`
      INSERT INTO deal_pipeline_stages (id, "pipelineId", name, description, "order", color, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
    `, [stageId, params.id, name, description || null, order ?? 0, color || '#CCCCCC']);

    const stage = await queryOne(`
      SELECT * FROM deal_pipeline_stages WHERE id = $1
    `, [stageId]);

    return NextResponse.json(stage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating stage:', error);
    return NextResponse.json(
      { error: 'Failed to create stage', details: error.message },
      { status: 500 }
    );
  }
}
