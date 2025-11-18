import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/pipelines - Fetch all pipelines
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Only admins and managers can access CRM
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch pipelines with stages
    const pipelinesQuery = `
      SELECT 
        p.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'stageId', s.id,
              'name', s.name,
              'description', s.description,
              'order', s.order,
              'color', s.color,
              'isActive', s."isActive",
              'pipelineId', s."pipelineId",
              'createdAt', s."createdAt",
              'updatedAt', s."updatedAt"
            ) ORDER BY s.order ASC
          ) FILTER (WHERE s."isActive" = true),
          '[]'::jsonb
        ) as stages,
        (SELECT COUNT(*) FROM "Deal" WHERE "pipelineId" = p.id) as _count
      FROM "DealPipeline" p
      LEFT JOIN "DealStage" s ON p.id = s."pipelineId" AND s."isActive" = true
      WHERE p."isActive" = true
      GROUP BY p.id
      ORDER BY p."isDefault" DESC, p."createdAt" ASC
    `;

    const pipelines = await query(pipelinesQuery);

    // Transform to match expected format
    const transformedPipelines = pipelines.map((pipeline: any) => ({
      ...pipeline,
      stages: pipeline.stages || [],
      _count: {
        deals: parseInt(pipeline._count) || 0,
      },
    }));

    return NextResponse.json(transformedPipelines);
  } catch (error: any) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipelines', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/investors/crm/pipelines - Create a new pipeline
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Only admins and managers can create pipelines
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, isDefault, stages } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Pipeline name is required' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await query(
        'UPDATE "DealPipeline" SET "isDefault" = false WHERE "isDefault" = true'
      );
    }

    // Generate pipeline ID
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create pipeline
    const pipelineQuery = `
      INSERT INTO "DealPipeline" (id, name, description, "isDefault", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `;

    const pipeline = await queryOne(pipelineQuery, [
      pipelineId,
      name,
      description || null,
      isDefault || false,
    ]);

    // Create stages if provided
    const createdStages = [];
    if (stages && Array.isArray(stages)) {
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageId = `stage_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
        
        const stageQuery = `
          INSERT INTO "DealStage" (
            id, "pipelineId", name, description, "order", color, "isActive", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
          RETURNING *
        `;

        const createdStage = await queryOne(stageQuery, [
          stageId,
          pipelineId,
          stage.name,
          stage.description || null,
          stage.order ?? i,
          stage.color || null,
        ]);

        createdStages.push(createdStage);
      }
    }

    // Return pipeline with stages
    return NextResponse.json({
      ...pipeline,
      stages: createdStages.sort((a, b) => (a.order || 0) - (b.order || 0)),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline', details: error.message },
      { status: 500 }
    );
  }
}
