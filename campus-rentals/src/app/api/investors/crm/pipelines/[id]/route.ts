import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/pipelines/[id] - Fetch a single pipeline
export async function GET(
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

    const pipeline = await queryOne(`
      SELECT 
        p.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'order', s."order",
              'color', s.color,
              'pipelineId', s."pipelineId",
              'createdAt', s."createdAt",
              'updatedAt', s."updatedAt"
            ) ORDER BY s.order ASC
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::jsonb
        ) as stages,
        (SELECT COUNT(*) FROM deals WHERE "pipelineId" = p.id) as _count
      FROM deal_pipelines p
      LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId"
      WHERE p.id = $1
      GROUP BY p.id
    `, [params.id]);

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...pipeline,
      _count: {
        deals: parseInt(pipeline._count) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/investors/crm/pipelines/[id] - Update a pipeline
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
    const { name, description, isDefault } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        'UPDATE deal_pipelines SET "isDefault" = false WHERE "isDefault" = true AND id != $1',
        [params.id]
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (isDefault !== undefined) {
      updates.push(`"isDefault" = $${paramIndex++}`);
      values.push(isDefault);
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`);
      values.push(params.id);

      await query(`
        UPDATE deal_pipelines SET ${updates.join(', ')} WHERE id = $${paramIndex}
      `, values);
    }

    // Fetch updated pipeline
    const pipeline = await queryOne(`
      SELECT 
        p.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'order', s."order",
              'color', s.color
            ) ORDER BY s.order ASC
          ),
          '[]'::jsonb
        ) as stages
      FROM deal_pipelines p
      LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId"
      WHERE p.id = $1
      GROUP BY p.id
    `, [params.id]);

    return NextResponse.json(pipeline);
  } catch (error: any) {
    console.error('Error updating pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/pipelines/[id] - Delete a pipeline
export async function DELETE(
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

        // Delete pipeline (no soft delete - column doesn't exist)
        await query('DELETE FROM deal_pipelines WHERE id = $1', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to delete pipeline', details: error.message },
      { status: 500 }
    );
  }
}
