import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/deals - Fetch all deals from investments (same source as investor dashboard)
// Auto-creates deals from investments if they don't exist, assigns to New Orleans pipeline
export async function GET(request: NextRequest) {
  try {
    console.log('[CRM Deals] Request received');
    const user = await requireAuth(request);
    console.log('[CRM Deals] User authenticated:', user?.id, user?.role);
    
    if (!user) {
      console.error('[CRM Deals] No user found');
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
    // Using SQL instead of Prisma
    let investments: any[] = [];
    try {
      if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        // Admin/Manager sees ALL investments (all statuses, all fundingStatus)
        investments = await query<any>(`
          SELECT 
            i.id,
            i."userId",
            i."propertyId",
            i."investmentAmount",
            p.id as "property_id",
            p.name as "property_name",
            p.address as "property_address",
            p.description as "property_description",
            p."dealStatus"::text as "property_dealStatus",
            p."fundingStatus"::text as "property_fundingStatus",
            p."currentValue" as "property_currentValue",
            p."totalCost" as "property_totalCost",
            p."acquisitionDate" as "property_acquisitionDate"
          FROM investments i
          INNER JOIN properties p ON i."propertyId" = p.id
          ORDER BY i."createdAt" DESC
        `);
      } else {
        // Investors only see their own investments (all statuses)
        investments = await query<any>(`
          SELECT 
            i.id,
            i."userId",
            i."propertyId",
            i."investmentAmount",
            p.id as "property_id",
            p.name as "property_name",
            p.address as "property_address",
            p.description as "property_description",
            p."dealStatus"::text as "property_dealStatus",
            p."fundingStatus"::text as "property_fundingStatus",
            p."currentValue" as "property_currentValue",
            p."totalCost" as "property_totalCost",
            p."acquisitionDate" as "property_acquisitionDate"
          FROM investments i
          INNER JOIN properties p ON i."propertyId" = p.id
          WHERE i."userId" = $1
          ORDER BY i."createdAt" DESC
        `, [user.id]);
      }
      console.log(`[CRM Deals] Found ${investments?.length || 0} investments for user ${user.id} (role: ${user.role})`);
    } catch (error: any) {
      console.error(`[CRM Deals] Error fetching investments:`, error);
      console.error(`[CRM Deals] Error message:`, error?.message);
      console.error(`[CRM Deals] Error stack:`, error?.stack);
      // Return empty array instead of error - we can still show existing deals
      investments = [];
      console.warn(`[CRM Deals] Continuing with empty investments array`);
    }

    // Get or create New Orleans pipeline
    let newOrleansPipeline: { id: string; stages: Array<{ id: string; order: number }> } | null = null;
    try {
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
        WHERE p.name = 'New Orleans'
        GROUP BY p.id
        LIMIT 1
      `);
      console.log(`[CRM Deals] Pipeline query result:`, newOrleansPipeline ? 'Found' : 'Not found');
    } catch (error: any) {
      console.error(`[CRM Deals] Error fetching New Orleans pipeline:`, error);
      console.error(`[CRM Deals] Error message:`, error?.message);
      console.error(`[CRM Deals] Error stack:`, error?.stack);
      // Continue - we'll try to create it
      newOrleansPipeline = null;
    }

    if (!newOrleansPipeline) {
      try {
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
        `, [pipelineId]);
        
        if (!newOrleansPipeline) {
          newOrleansPipeline = { id: pipelineId, stages: [] };
        }
      } catch (error: any) {
        console.error(`[CRM Deals] Error creating New Orleans pipeline:`, error.message);
        return NextResponse.json(
          { error: 'Failed to create pipeline', details: error.message },
          { status: 500 }
        );
      }
    }

    if (!newOrleansPipeline || !newOrleansPipeline.id) {
      console.error(`[CRM Deals] Failed to get or create New Orleans pipeline`);
      console.error(`[CRM Deals] Pipeline value:`, JSON.stringify(newOrleansPipeline));
      return NextResponse.json(
        { error: 'Failed to initialize pipeline', details: 'New Orleans pipeline not found or created' },
        { status: 500 }
      );
    }

    console.log(`[CRM Deals] Using pipeline: ${newOrleansPipeline.id} with ${newOrleansPipeline.stages?.length || 0} stages`);

    const firstStage = Array.isArray(newOrleansPipeline.stages) && newOrleansPipeline.stages.length > 0
      ? newOrleansPipeline.stages[0].id
      : null;
    
    if (!firstStage) {
      console.warn(`[CRM Deals] Warning: No stages found in New Orleans pipeline, deals will be created without stageId`);
    }

    // Auto-create deals from investments if they don't exist
    // IMPORTANT: Create deals for ALL investments regardless of fundingStatus
    let createdCount = 0;
    let skippedCount = 0;
    
    // Only try to create deals if we have investments and a valid pipeline
    if (investments && investments.length > 0 && newOrleansPipeline && newOrleansPipeline.id) {
      try {
        for (const investment of investments) {
          if (!investment || !investment.propertyId) {
            console.log(`[CRM Deals] Skipping invalid investment: ${investment?.id || 'unknown'}`);
            skippedCount++;
            continue;
          }
          
          // Property fields are returned as separate columns from SQL query
          const property = {
            id: investment.property_id,
            name: investment.property_name,
            address: investment.property_address,
            description: investment.property_description,
            dealStatus: investment.property_dealStatus,
            fundingStatus: investment.property_fundingStatus,
            currentValue: investment.property_currentValue,
            totalCost: investment.property_totalCost,
            acquisitionDate: investment.property_acquisitionDate
          };
          
          if (!property || !property.id) {
            console.log(`[CRM Deals] Skipping investment ${investment.id} - no property (propertyId: ${investment.propertyId})`);
            skippedCount++;
            continue;
          }

          // Check if deal already exists for this property
          let existingDeal;
          try {
            existingDeal = await queryOne<{ id: string }>(
              'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
              [investment.propertyId]
            );
          } catch (error: any) {
            console.error(`[CRM Deals] Error checking for existing deal:`, error?.message);
            continue; // Skip this investment if we can't check
          }

          if (!existingDeal) {
            // Create deal from investment - ALL investments get deals
            const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const dealType = property.dealStatus === 'UNDER_CONSTRUCTION' ? 'DEVELOPMENT' : 'ACQUISITION';
            const status = property.dealStatus || 'STABILIZED';
            const priority = 'MEDIUM';
            const estimatedValue = property.currentValue || property.totalCost || investment.investmentAmount || 0;
            
            // Include both FUNDED and FUNDING in tags
            const tags = [];
            if (property.fundingStatus === 'FUNDING') {
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
                property.name || `Property ${investment.propertyId}`,
                dealType,
                status,
                priority,
                newOrleansPipeline.id,
                firstStage,
                investment.propertyId,
                property.description || null,
                estimatedValue,
                property.acquisitionDate ? new Date(property.acquisitionDate) : null,
                'Auto-created from Investment',
                JSON.stringify(tags),
                section,
              ]);
              createdCount++;
              console.log(`[CRM Deals] Created deal ${dealId} for property ${investment.propertyId}`);
            } catch (error: any) {
              console.error(`[CRM Deals] Error creating deal for property ${investment.propertyId}:`, error?.message);
            }
          } else {
            skippedCount++;
          }
        }
      } catch (error: any) {
        console.error(`[CRM Deals] Error during auto-creation loop:`, error);
        console.error(`[CRM Deals] Error message:`, error?.message);
        console.error(`[CRM Deals] Error stack:`, error?.stack);
        // Continue anyway - we'll still try to fetch existing deals
      }
      
      console.log(`[CRM Deals] Auto-creation complete: ${createdCount} created, ${skippedCount} already existed`);
    } else {
      console.log(`[CRM Deals] Skipping auto-creation - investments: ${investments?.length || 0}, pipeline: ${newOrleansPipeline ? 'exists' : 'missing'}`);
    }

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
      // Execute query with proper error handling
      const result = await query(dealsQuery, queryParams);
      deals = Array.isArray(result) ? result : [];
      console.log(`[CRM Deals] Query executed successfully, found ${deals?.length || 0} deals`);
    } catch (error: any) {
      console.error(`[CRM Deals] Query error:`, error);
      console.error(`[CRM Deals] Error message:`, error?.message);
      console.error(`[CRM Deals] Error stack:`, error?.stack);
      console.error(`[CRM Deals] Query was:`, dealsQuery.substring(0, 500) + '...');
      console.error(`[CRM Deals] Params were:`, queryParams);
      // Return empty array instead of error to prevent frontend crash
      deals = [];
      console.warn(`[CRM Deals] Returning empty deals array due to query error`);
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
    console.error('[CRM Deals] Top-level error:', error);
    console.error('[CRM Deals] Error message:', error?.message);
    console.error('[CRM Deals] Error stack:', error?.stack);
    console.error('[CRM Deals] Error name:', error?.name);
    return NextResponse.json(
      { 
        error: 'Failed to fetch deals', 
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
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
