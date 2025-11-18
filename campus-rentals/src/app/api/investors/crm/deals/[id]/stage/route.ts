import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
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
      const stage = await queryOne(`
        SELECT id FROM deal_pipeline_stages
        WHERE id = $1 AND "pipelineId" = $2 AND "isActive" = true
        LIMIT 1
      `, [stageId, pipelineId]);

      if (!stage) {
        return NextResponse.json(
          { error: 'Stage not found or does not belong to pipeline' },
          { status: 404 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    updates.push(`"stageId" = $${paramIndex++}`);
    values.push(stageId);

    if (pipelineId) {
      updates.push(`"pipelineId" = $${paramIndex++}`);
      values.push(pipelineId);
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(params.id);

    await query(`
      UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramIndex}
    `, values);

    // Fetch updated deal
    const deal = await queryOne(`
      SELECT 
        d.*,
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'order', s.order,
          'color', s.color
        ) as stage,
        jsonb_build_object(
          'id', p.id,
          'name', p.name
        ) as pipeline
      FROM deals d
      LEFT JOIN deal_pipeline_stages s ON d."stageId" = s.id
      LEFT JOIN deal_pipelines p ON d."pipelineId" = p.id
      WHERE d.id = $1
    `, [params.id]);

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error updating deal stage:', error);
    return NextResponse.json(
      { error: 'Failed to update deal stage', details: error.message },
      { status: 500 }
    );
  }
}
