import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/deals - Fetch all deals (shared data - investors see their deals, admins see all)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');
    const stageId = searchParams.get('stageId');
    const search = searchParams.get('search');

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // If user is investor, only show deals for properties they've invested in
    if (user.role === 'INVESTOR') {
      // Get property IDs where user has investments
      const userInvestments = await query<{ propertyId: string }>(
        'SELECT "propertyId" FROM investments WHERE "userId" = $1',
        [user.id]
      );

      // Get property IDs from entity investments where user is an owner
      const entityInvestments = await query<{ propertyId: string }>(
        `SELECT DISTINCT ei."propertyId"
         FROM entity_investments ei
         LEFT JOIN entities e ON ei."entityId" = e.id
         LEFT JOIN entity_owners eo ON e.id = eo."entityId"
         LEFT JOIN entity_investment_owners eio ON ei.id = eio."entityInvestmentId"
         WHERE (eo."userId" = $1 OR eio."userId" = $1)`,
        [user.id]
      );

      const propertyIds = new Set<string>();
      userInvestments.forEach((inv) => propertyIds.add(inv.propertyId));
      entityInvestments.forEach((ei) => propertyIds.add(ei.propertyId));

      if (propertyIds.size === 0) {
        return NextResponse.json([]);
      }

      const placeholders = Array.from(propertyIds).map((_, i) => `$${paramIndex + i}`).join(', ');
      whereConditions.push(`d."propertyId" IN (${placeholders})`);
      queryParams.push(...Array.from(propertyIds));
      paramIndex += propertyIds.size;
    } else if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (pipelineId) {
      whereConditions.push(`d."pipelineId" = $${paramIndex}`);
      queryParams.push(pipelineId);
      paramIndex++;
    }

    if (stageId) {
      whereConditions.push(`d."stageId" = $${paramIndex}`);
      queryParams.push(stageId);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Main query with joins
    const dealsQuery = `
      SELECT 
        d.*,
        jsonb_build_object(
          'id', p.id,
          'pipelineId', p.id,
          'name', p.name,
          'description', p.description,
          'isDefault', p."isDefault"
        ) as pipeline,
        jsonb_build_object(
          'id', s.id,
          'stageId', s.id,
          'name', s.name,
          'description', s.description,
          'order', s.order,
          'color', s.color
        ) as stage,
        jsonb_build_object(
          'id', prop.id,
          'propertyId', prop."propertyId",
          'name', prop.name,
          'address', prop.address
        ) as property,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as assignedTo,
        jsonb_build_object(
          'tasks', COALESCE(task_count.count, 0),
          'notes', COALESCE(note_count.count, 0),
          'relationships', COALESCE(rel_count.count, 0)
        ) as _count
      FROM deals d
      LEFT JOIN deal_pipelines p ON d."pipelineId" = p.id
      LEFT JOIN deal_pipeline_stages s ON d."stageId" = s.id
      LEFT JOIN properties prop ON d."propertyId" = prop.id
      LEFT JOIN users u ON d."assignedToId" = u.id
      LEFT JOIN (
        SELECT "dealId", COUNT(*) as count
        FROM deal_tasks
        GROUP BY "dealId"
      ) task_count ON d.id = task_count."dealId"
      LEFT JOIN (
        SELECT "dealId", COUNT(*) as count
        FROM deal_notes
        GROUP BY "dealId"
      ) note_count ON d.id = note_count."dealId"
      LEFT JOIN (
        SELECT "dealId", COUNT(*) as count
        FROM deal_relationships
        GROUP BY "dealId"
      ) rel_count ON d.id = rel_count."dealId"
      ${whereClause}
      ORDER BY d."createdAt" DESC
    `;

    const deals = await query(dealsQuery, queryParams);

    // Transform the results to match expected format
    const transformedDeals = deals.map((deal: any) => ({
      ...deal,
      pipeline: deal.pipeline || null,
      stage: deal.stage || null,
      property: deal.property || null,
      assignedTo: deal.assignedTo || null,
      _count: deal._count || { tasks: 0, notes: 0, relationships: 0 },
    }));

    return NextResponse.json(transformedDeals);
  } catch (error: any) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/investors/crm/deals - Create a new deal
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
    const {
      name,
      dealType,
      status,
      priority,
      pipelineId,
      stageId,
      propertyId,
      description,
      estimatedValue,
      estimatedCloseDate,
      actualCloseDate,
      source,
      assignedToId,
      tags,
      metadata,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Deal name is required' },
        { status: 400 }
      );
    }

    // Generate ID
    const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert deal
    const insertQuery = `
      INSERT INTO deals (
        id, name, "dealType", status, priority, "pipelineId", "stageId",
        "propertyId", description, "estimatedValue", "estimatedCloseDate",
        "actualCloseDate", source, "assignedToId", tags, metadata, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      ) RETURNING *
    `;

    const deal = await queryOne(insertQuery, [
      dealId,
      name,
      dealType || 'ACQUISITION',
      status || 'NEW',
      priority || 'MEDIUM',
      pipelineId || null,
      stageId || null,
      propertyId || null,
      description || null,
      estimatedValue || null,
      estimatedCloseDate ? new Date(estimatedCloseDate) : null,
      actualCloseDate ? new Date(actualCloseDate) : null,
      source || null,
      assignedToId || null,
      tags ? JSON.stringify(tags) : JSON.stringify([]),
      metadata ? JSON.stringify(metadata) : JSON.stringify({}),
    ]);

    // Create deal tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        try {
          await query(
            'INSERT INTO deal_tags (id, "dealId", tag, "createdAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
            [`tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, dealId, tag]
          );
        } catch (error) {
          // Ignore duplicate tag errors
          console.warn('Failed to create deal tag:', error);
        }
      }
    }

    // Fetch the complete deal with relations
    const fullDealQuery = `
      SELECT 
        d.*,
        jsonb_build_object(
          'id', p.id,
          'pipelineId', p.id,
          'name', p.name,
          'description', p.description,
          'isDefault', p."isDefault"
        ) as pipeline,
        jsonb_build_object(
          'id', s.id,
          'stageId', s.id,
          'name', s.name,
          'description', s.description,
          'order', s.order,
          'color', s.color
        ) as stage,
        jsonb_build_object(
          'id', prop.id,
          'propertyId', prop."propertyId",
          'name', prop.name,
          'address', prop.address
        ) as property,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as assignedTo
      FROM deals d
      LEFT JOIN deal_pipelines p ON d."pipelineId" = p.id
      LEFT JOIN deal_pipeline_stages s ON d."stageId" = s.id
      LEFT JOIN properties prop ON d."propertyId" = prop.id
      LEFT JOIN users u ON d."assignedToId" = u.id
      WHERE d.id = $1
    `;

    const fullDeal = await queryOne(fullDealQuery, [dealId]);

    return NextResponse.json(fullDeal, { status: 201 });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal', details: error.message },
      { status: 500 }
    );
  }
}
