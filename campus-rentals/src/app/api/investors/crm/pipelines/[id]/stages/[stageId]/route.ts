import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT /api/investors/crm/pipelines/[id]/stages/[stageId] - Update a stage
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
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
    const { name, description, order, color, isActive } = body;

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
    if (order !== undefined) {
      updates.push(`"order" = $${paramIndex++}`);
      values.push(order);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (isActive !== undefined) {
      updates.push(`"isActive" = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`);
      values.push(params.stageId);

      await query(`
        UPDATE deal_pipeline_stages SET ${updates.join(', ')} WHERE id = $${paramIndex}
      `, values);
    }

    const stage = await queryOne(`
      SELECT * FROM deal_pipeline_stages WHERE id = $1
    `, [params.stageId]);

    return NextResponse.json(stage);
  } catch (error: any) {
    console.error('Error updating stage:', error);
    return NextResponse.json(
      { error: 'Failed to update stage', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/pipelines/[id]/stages/[stageId] - Delete a stage
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
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

    // Soft delete by setting isActive to false
    await query('UPDATE deal_pipeline_stages SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1', [params.stageId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting stage:', error);
    return NextResponse.json(
      { error: 'Failed to delete stage', details: error.message },
      { status: 500 }
    );
  }
}
