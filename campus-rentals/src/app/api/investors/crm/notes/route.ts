import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Any authenticated user can add a note to a deal (for full pipeline tracking)

    const body = await request.json();
    const { dealId, content, isPrivate } = body;

    if (!dealId || !content) {
      return NextResponse.json(
        { error: 'Deal ID and content are required' },
        { status: 400 }
      );
    }

    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(`
      INSERT INTO deal_notes (
        id, "dealId", content, "isPrivate", "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [
      noteId,
      dealId,
      content,
      isPrivate || false,
      user.id,
    ]);

    // Fetch the created note with relations
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
    `, [noteId]);

    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note', details: error.message },
      { status: 500 }
    );
  }
}
