import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT /api/investors/crm/tasks/[id] - Update a task
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
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedToId,
      completedAt,
    } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      // Auto-set completedAt if status is COMPLETED
      if (status === 'COMPLETED' && completedAt === undefined) {
        updates.push(`"completedAt" = $${paramIndex++}`);
        values.push(new Date());
      } else if (status !== 'COMPLETED') {
        updates.push(`"completedAt" = $${paramIndex++}`);
        values.push(null);
      }
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (dueDate !== undefined) {
      updates.push(`"dueDate" = $${paramIndex++}`);
      values.push(dueDate ? new Date(dueDate) : null);
    }
    if (assignedToId !== undefined) {
      updates.push(`"assignedToId" = $${paramIndex++}`);
      values.push(assignedToId);
    }
    if (completedAt !== undefined) {
      updates.push(`"completedAt" = $${paramIndex++}`);
      values.push(completedAt ? new Date(completedAt) : null);
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`);
      values.push(params.id);

      await query(`
        UPDATE deal_tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}
      `, values);
    }

    // Fetch updated task
    const task = await queryOne(`
      SELECT 
        dt.*,
        jsonb_build_object(
          'id', d.id,
          'name', d.name
        ) as deal,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "assignedTo"
      FROM deal_tasks dt
      LEFT JOIN deals d ON dt."dealId" = d.id
      LEFT JOIN users u ON dt."assignedToId" = u.id
      WHERE dt.id = $1
    `, [params.id]);

    return NextResponse.json(task);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/tasks/[id] - Delete a task
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

    await query('DELETE FROM deal_tasks WHERE id = $1', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task', details: error.message },
      { status: 500 }
    );
  }
}
