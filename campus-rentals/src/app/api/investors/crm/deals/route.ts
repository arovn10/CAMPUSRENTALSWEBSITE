import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/investors/crm/deals - Fetch all deals from investments (same source as investor dashboard)
// Auto-creates deals from investments if they don't exist, assigns to New Orleans pipeline
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
    const fundingStatus = searchParams.get('fundingStatus');

    // Get investments from the same source as investor dashboard (/api/investors/properties)
    // IMPORTANT: Get ALL investments regardless of status for CRM backend
    let investments;
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      // Admin/Manager sees ALL investments (all statuses, all fundingStatus)
      investments = await prisma.investment.findMany({
        include: { 
          property: true,
          distributions: true,
          user: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Investors only see their own investments (all statuses)
      investments = await prisma.investment.findMany({
        where: { userId: user.id },
        include: { 
          property: true,
          distributions: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    console.log(`[CRM Deals] Found ${investments.length} investments for user ${user.id} (role: ${user.role})`);

    // Get or create New Orleans pipeline
    let newOrleansPipeline = await queryOne<{ id: string; stages: Array<{ id: string; order: number }> }>(`
      SELECT 
        p.id,
        COALESCE(
          jsonb_agg(
            jsonb_build_object('id', s.id, 'order', s."order")
            ORDER BY s."order" ASC
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::jsonb
        ) as stages
      FROM deal_pipelines p
      LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId"
      WHERE p.name = 'New Orleans'
      GROUP BY p.id
      LIMIT 1
    `);

    if (!newOrleansPipeline) {
      // Create New Orleans pipeline
      const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if createdBy column exists and allows NULL
      const columnExists = await queryOne<{ exists: boolean; is_nullable: string }>(`
        SELECT 
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'deal_pipelines' AND column_name = 'createdBy'
          ) as exists,
          COALESCE((
            SELECT is_nullable FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'deal_pipelines' AND column_name = 'createdBy'
          ), 'YES') as is_nullable
      `);

      if (columnExists?.exists && columnExists?.is_nullable === 'NO') {
        // Try to find a valid user
        const adminUser = await queryOne<{ id: string }>(
          'SELECT id FROM users WHERE role = $1 OR role = $2 LIMIT 1',
          ['ADMIN', 'MANAGER']
        );
        if (adminUser) {
          await query(`
            INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, false, $4, NOW(), NOW())
          `, [pipelineId, 'New Orleans', 'Pipeline for New Orleans deals', adminUser.id]);
        } else {
          await query(`
            INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, false, NOW(), NOW())
          `, [pipelineId, 'New Orleans', 'Pipeline for New Orleans deals']);
        }
      } else {
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, NULL, NOW(), NOW())
        `, [pipelineId, 'New Orleans', 'Pipeline for New Orleans deals']);
      }

      // Create default stages
      const stages = [
        { name: 'New', order: 0, color: '#3B82F6' },
        { name: 'In Progress', order: 1, color: '#F59E0B' },
        { name: 'Closed', order: 2, color: '#10B981' },
      ];

      for (const stage of stages) {
        const stageId = `stage_${Date.now()}_${stage.order}_${Math.random().toString(36).substr(2, 9)}`;
        await query(`
          INSERT INTO deal_pipeline_stages (id, "pipelineId", name, "order", color, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [stageId, pipelineId, stage.name, stage.order, stage.color]);
      }

      // Fetch the created pipeline
      newOrleansPipeline = await queryOne<{ id: string; stages: Array<{ id: string; order: number }> }>(`
        SELECT 
          p.id,
          COALESCE(
            jsonb_agg(
              jsonb_build_object('id', s.id, 'order', s."order")
              ORDER BY s."order" ASC
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::jsonb
          ) as stages
        FROM deal_pipelines p
        LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId"
        WHERE p.id = $1
        GROUP BY p.id
      `, [pipelineId]) || { id: pipelineId, stages: [] };
    }

    const firstStage = Array.isArray(newOrleansPipeline.stages) && newOrleansPipeline.stages.length > 0
      ? newOrleansPipeline.stages[0].id
      : null;

    // Auto-create deals from investments if they don't exist
    // IMPORTANT: Create deals for ALL investments regardless of fundingStatus
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const investment of investments) {
      if (!investment.property) {
        console.log(`[CRM Deals] Skipping investment ${investment.id} - no property`);
        skippedCount++;
        continue;
      }

      // Check if deal already exists for this property
      const existingDeal = await queryOne<{ id: string }>(
        'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
        [investment.propertyId]
      );

      if (!existingDeal) {
        // Create deal from investment - ALL investments get deals
        const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const dealType = investment.property.dealStatus === 'UNDER_CONSTRUCTION' ? 'DEVELOPMENT' : 'ACQUISITION';
        const status = investment.property.dealStatus || 'STABILIZED';
        const priority = 'MEDIUM';
        const estimatedValue = investment.property.currentValue || investment.property.totalCost || investment.investmentAmount || 0;
        
        // Include both FUNDED and FUNDING in tags
        const tags = [];
        if (investment.property.fundingStatus === 'FUNDING') {
          tags.push('FUNDING');
        } else {
          tags.push('FUNDED');
        }
        
        const section = 'ACQUISITIONS';

        try {
          await query(`
            INSERT INTO deals (
              id, name, "dealType", status, priority, "pipelineId", "stageId",
              "propertyId", description, "estimatedValue", "estimatedCloseDate",
              source, tags, section, "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
            )
          `, [
            dealId,
            investment.property.name || `Property ${investment.propertyId}`,
            dealType,
            status,
            priority,
            newOrleansPipeline.id,
            firstStage,
            investment.propertyId,
            investment.property.description || null,
            estimatedValue,
            investment.property.acquisitionDate ? new Date(investment.property.acquisitionDate) : null,
            'Auto-created from Investment',
            JSON.stringify(tags),
            section,
          ]);
          createdCount++;
          console.log(`[CRM Deals] Created deal ${dealId} for property ${investment.propertyId}`);
        } catch (error: any) {
          console.error(`[CRM Deals] Error creating deal for property ${investment.propertyId}:`, error.message);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`[CRM Deals] Auto-creation complete: ${createdCount} created, ${skippedCount} already existed`);

    // Now fetch all deals (including newly created ones)
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by pipeline if specified
    if (pipelineId && pipelineId !== 'all') {
      whereConditions.push(`d."pipelineId" = $${paramIndex}`);
      queryParams.push(pipelineId);
      paramIndex++;
    }
    // If no pipelineId specified, show all deals (no filter)

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

    if (fundingStatus) {
      whereConditions.push(`prop."fundingStatus" = $${paramIndex}::text`);
      queryParams.push(fundingStatus);
      paramIndex++;
    }

    // If user is investor, only show deals for properties they've invested in
    // For ADMIN/MANAGER, show ALL deals regardless of investment status
    if (user.role === 'INVESTOR') {
      const propertyIds = investments.map(inv => inv.propertyId).filter(Boolean);
      if (propertyIds.length === 0) {
        console.log(`[CRM Deals] Investor ${user.id} has no investments, returning empty array`);
        return NextResponse.json([]);
      }
      const placeholders = propertyIds.map((_, i) => `$${paramIndex + i}`).join(', ');
      whereConditions.push(`d."propertyId" IN (${placeholders})`);
      queryParams.push(...propertyIds);
      paramIndex += propertyIds.length;
      console.log(`[CRM Deals] Investor filter: showing deals for ${propertyIds.length} properties`);
    } else {
      // ADMIN/MANAGER: Show ALL deals (no property filter)
      console.log(`[CRM Deals] Admin/Manager view: showing ALL deals`);
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
          'order', s."order",
          'color', s.color
        ) as stage,
        jsonb_build_object(
          'id', prop.id,
          'propertyId', prop.id,
          'name', prop.name,
          'address', prop.address,
          'description', prop.description,
          'bedrooms', prop.bedrooms,
          'bathrooms', prop.bathrooms,
          'squareFeet', prop."squareFeet",
          'monthlyRent', prop."monthlyRent",
          'otherIncome', prop."otherIncome",
          'annualExpenses', prop."annualExpenses",
          'capRate', prop."capRate",
          'acquisitionDate', prop."acquisitionDate",
          'acquisitionPrice', prop."acquisitionPrice",
          'constructionCost', prop."constructionCost",
          'totalCost', prop."totalCost",
          'debtAmount', prop."debtAmount",
          'occupancyRate', prop."occupancyRate",
          'currentValue', prop."currentValue",
          'dealStatus', prop."dealStatus"::text,
          'fundingStatus', prop."fundingStatus"::text,
          'propertyType', prop."propertyType"::text
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

    let deals;
    try {
      deals = await query(dealsQuery, queryParams);
      console.log(`[CRM Deals] Query executed successfully, found ${deals?.length || 0} deals`);
    } catch (error: any) {
      console.error(`[CRM Deals] Query error:`, error.message);
      console.error(`[CRM Deals] Query was:`, dealsQuery.substring(0, 200) + '...');
      console.error(`[CRM Deals] Params were:`, queryParams);
      return NextResponse.json(
        { error: 'Failed to fetch deals', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`[CRM Deals] Returning ${deals?.length || 0} deals (filters: pipelineId=${pipelineId || 'all'}, stageId=${stageId || 'none'}, search=${search || 'none'}, fundingStatus=${fundingStatus || 'all'})`);

    // Transform the results to match expected format
    const transformedDeals = (deals || []).map((deal: any) => ({
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
          'order', s."order",
          'color', s.color
        ) as stage,
        jsonb_build_object(
          'id', prop.id,
          'propertyId', prop.id,
          'name', prop.name,
          'address', prop.address,
          'fundingStatus', prop."fundingStatus"
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
