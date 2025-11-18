import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT /api/investors/crm/notes/[id] - Update a note
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
    const { content, isPrivate } = body;

    // Check if user owns the note (for private notes)
    const existingNote = await queryOne<{ isPrivate: boolean; createdById: string }>(
      'SELECT "isPrivate", "createdById" FROM deal_notes WHERE id = $1',
      [params.id]
    );

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Only allow editing if user is admin/manager or owns the note
    if (existingNote.isPrivate && existingNote.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to edit this note' },
        { status: 403 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (isPrivate !== undefined) {
      updates.push(`"isPrivate" = $${paramIndex++}`);
      values.push(isPrivate);
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`);
      values.push(params.id);

      await query(`
        UPDATE deal_notes SET ${updates.join(', ')} WHERE id = $${paramIndex}
      `, values);
    }

    // Fetch updated note
    const note = await queryOne(`
      SELECT 
        dn.*,
        jsonb_build_object(
          'id', d.id,
          'name', d.name
        ) as deal,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "createdBy"
      FROM deal_notes dn
      LEFT JOIN deals d ON dn."dealId" = d.id
      LEFT JOIN users u ON dn."createdById" = u.id
      WHERE dn.id = $1
    `, [params.id]);

    return NextResponse.json(note);
  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/notes/[id] - Delete a note
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

    // Check if user owns the note (for private notes)
    const existingNote = await queryOne<{ isPrivate: boolean; createdById: string }>(
      'SELECT "isPrivate", "createdById" FROM deal_notes WHERE id = $1',
      [params.id]
    );

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Only allow deleting if user is admin/manager or owns the note
    if (existingNote.isPrivate && existingNote.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this note' },
        { status: 403 }
      );
    }

    await query('DELETE FROM deal_notes WHERE id = $1', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note', details: error.message },
      { status: 500 }
    );
  }
}
