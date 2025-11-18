import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/relationships - Create a new relationship
export async function POST(request: NextRequest) {
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
    const { dealId, contactId, userId, role, notes } = body;

    if (!dealId || !role) {
      return NextResponse.json(
        { error: 'Deal ID and role are required' },
        { status: 400 }
      );
    }

    if (!contactId && !userId) {
      return NextResponse.json(
        { error: 'Either contact ID or user ID is required' },
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const existing = await queryOne(`
      SELECT id FROM deal_relationships
      WHERE "dealId" = $1 AND role = $2
        AND (($3::text IS NOT NULL AND "contactId" = $3) OR ($4::text IS NOT NULL AND "userId" = $4))
      LIMIT 1
    `, [dealId, role, contactId || null, userId || null]);

    if (existing) {
      return NextResponse.json(
        { error: 'Relationship already exists' },
        { status: 409 }
      );
    }

    const relationshipId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(`
      INSERT INTO deal_relationships (id, "dealId", "contactId", "userId", role, notes, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [relationshipId, dealId, contactId || null, userId || null, role, notes || null]);

    // Fetch the created relationship with relations
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
    `, [relationshipId]);

    return NextResponse.json(relationship, { status: 201 });
  } catch (error: any) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship', details: error.message },
      { status: 500 }
    );
  }
}
