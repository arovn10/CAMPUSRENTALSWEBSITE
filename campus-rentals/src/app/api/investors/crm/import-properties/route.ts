import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/import-properties - Import all properties as deals
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
    const { pipelineId, stageId } = body;

    // Get default pipeline if not provided
    let targetPipelineId = pipelineId;
    let targetStageId = stageId;

    if (!targetPipelineId) {
      const defaultPipeline = await queryOne<{
        id: string;
        stages: Array<{ id: string; order: number }>;
      }>(`
        SELECT 
          p.*,
          COALESCE(
            jsonb_agg(
              jsonb_build_object('id', s.id, 'order', s.order)
              ORDER BY s.order ASC
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::jsonb
          ) as stages
        FROM deal_pipelines p
        LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId"
        WHERE p."isDefault" = true
        GROUP BY p.id, p.name, p.description, p."isDefault"
        LIMIT 1
      `);

      if (!defaultPipeline) {
        // Create a default pipeline if none exists
        const newPipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, true, $4, NOW(), NOW())
        `, [newPipelineId, 'Default Pipeline', 'Default pipeline for imported properties', user.id]);

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
          `, [stageId, newPipelineId, stage.name, stage.order, stage.color]);
        }

        // Fetch the created pipeline
        const createdPipeline = await queryOne<{
          id: string;
          stages: Array<{ id: string; order: number }>;
        }>(`
          SELECT 
            p.*,
            COALESCE(
              jsonb_agg(
                jsonb_build_object('id', s.id, 'order', s.order)
                ORDER BY s.order ASC
              ) FILTER (WHERE s."isActive" = true),
              '[]'::jsonb
            ) as stages
          FROM deal_pipelines p
          LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId" AND s."isActive" = true
          WHERE p.id = $1
          GROUP BY p.id
        `, [newPipelineId]);

        targetPipelineId = newPipelineId;
        targetStageId = Array.isArray(createdPipeline?.stages) && createdPipeline.stages.length > 0
          ? createdPipeline.stages[0].id
          : null;
      } else {
        targetPipelineId = defaultPipeline.id;
        targetStageId = targetStageId || (Array.isArray(defaultPipeline.stages) && defaultPipeline.stages.length > 0
          ? defaultPipeline.stages[0].id
          : null);
      }
    }

    // Fetch all properties
    const properties = await query<{
      id: string;
      name: string;
      description: string | null;
      address: string | null;
      dealStatus: string | null;
      fundingStatus: string | null;
      currentValue: number | null;
      totalCost: number | null;
      acquisitionDate: Date | null;
    }>(`
      SELECT id, name, description, address, "dealStatus", "fundingStatus",
             "currentValue", "totalCost", "acquisitionDate"
      FROM properties
      WHERE "isActive" = true
    `);

    const importedDeals = [];
    const skippedDeals = [];
    const errors = [];

    for (const property of properties) {
      try {
        // Check if deal already exists for this property
        const existingDeal = await queryOne<{ id: string }>(
          'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
          [property.id]
        );

        if (existingDeal) {
          skippedDeals.push({
            propertyId: property.id,
            propertyName: property.name,
            reason: 'Deal already exists',
          });
          continue;
        }

        // Determine deal type based on deal status
        let dealType = 'ACQUISITION';
        if (property.dealStatus === 'UNDER_CONSTRUCTION') {
          dealType = 'DEVELOPMENT';
        } else if (property.dealStatus === 'SOLD') {
          dealType = 'DISPOSITION';
        }

        // Determine priority based on funding status
        let priority = 'MEDIUM';
        if (property.fundingStatus === 'FUNDING') {
          priority = 'HIGH';
        }

        // Convert enum to string for status field
        const statusString = property.dealStatus ? String(property.dealStatus) : 'STABILIZED';
        const tags = property.dealStatus ? JSON.stringify([String(property.dealStatus)]) : JSON.stringify([]);

        // Create deal
        const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await query(`
          INSERT INTO deals (
            id, name, "dealType", status, priority, "pipelineId", "stageId",
            "propertyId", description, "estimatedValue", "estimatedCloseDate",
            "actualCloseDate", source, tags, "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
          )
        `, [
          dealId,
          property.name,
          dealType,
          statusString,
          priority,
          targetPipelineId || null,
          targetStageId || null,
          property.id,
          property.description || null,
          property.currentValue || property.totalCost || null,
          property.acquisitionDate || null,
          property.dealStatus === 'SOLD' ? property.acquisitionDate : null,
          'Imported from Properties',
          tags,
        ]);

        importedDeals.push({
          id: dealId,
          name: property.name,
          propertyId: property.id,
        });
      } catch (error: any) {
        console.error(`Error importing property ${property.id} (${property.name}):`, error);
        errors.push({
          propertyId: property.id,
          propertyName: property.name,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedDeals.length,
      skipped: skippedDeals.length,
      errors: errors.length,
      importedDeals,
      skippedDeals,
      errorDetails: errors,
    });
  } catch (error: any) {
    console.error('Error importing properties:', error);
    return NextResponse.json(
      { error: 'Failed to import properties', details: error.message },
      { status: 500 }
    );
  }
}
