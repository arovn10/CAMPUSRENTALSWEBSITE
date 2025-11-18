import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT /api/investors/crm/relationships/[id] - Update a relationship
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
    const { role, notes } = body;

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`);
      values.push(params.id);

      await query(`
        UPDATE deal_relationships SET ${updates.join(', ')} WHERE id = $${paramIndex}
      `, values);
    }

    // Fetch updated relationship
    const relationship = await queryOne(`
      SELECT 
        dr.*,
        jsonb_build_object(
          'id', d.id,
          'name', d.name
        ) as deal,
        c.* as contact,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "user"
      FROM deal_relationships dr
      LEFT JOIN deals d ON dr."dealId" = d.id
      LEFT JOIN contacts c ON dr."contactId" = c.id
      LEFT JOIN users u ON dr."userId" = u.id
      WHERE dr.id = $1
    `, [params.id]);

    return NextResponse.json(relationship);
  } catch (error: any) {
    console.error('Error updating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/relationships/[id] - Delete a relationship
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

    await query('DELETE FROM deal_relationships WHERE id = $1', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json(
      { error: 'Failed to delete relationship', details: error.message },
      { status: 500 }
    );
  }
}
