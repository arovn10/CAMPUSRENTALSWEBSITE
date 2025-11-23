/**
 * API endpoint to setup New Orleans pipeline and create deals
 * Can be called from the frontend or directly
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Setup Pipeline] Starting setup...');

    // Step 1: Get or create New Orleans pipeline
    let pipeline = await queryOne<{ id: string }>(`
      SELECT id FROM deal_pipelines WHERE name = 'New Orleans' LIMIT 1
    `);

    let pipelineId: string;
    if (!pipeline) {
      console.log('[Setup Pipeline] Creating New Orleans pipeline...');
      pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if createdBy column exists
      const columnCheck = await queryOne<{ exists: boolean; is_nullable: string }>(`
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

      let createdByValue: string | null = null;
      if (columnCheck?.exists && columnCheck?.is_nullable === 'NO') {
        const adminUser = await queryOne<{ id: string }>(
          'SELECT id FROM users WHERE role = $1 OR role = $2 LIMIT 1',
          ['ADMIN', 'MANAGER']
        );
        if (adminUser) {
          createdByValue = adminUser.id;
        }
      }

      if (createdByValue) {
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, $4, NOW(), NOW())
        `, [pipelineId, 'New Orleans', 'Pipeline for New Orleans deals', createdByValue]);
      } else {
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, NOW(), NOW())
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

      console.log(`[Setup Pipeline] Created pipeline: ${pipelineId}`);
    } else {
      pipelineId = pipeline.id;
      console.log(`[Setup Pipeline] Pipeline already exists: ${pipelineId}`);
    }

    // Step 2: Get first stage
    const firstStage = await queryOne<{ id: string }>(`
      SELECT id FROM deal_pipeline_stages 
      WHERE "pipelineId" = $1 
      ORDER BY "order" ASC 
      LIMIT 1
    `, [pipelineId]);

    if (!firstStage) {
      return NextResponse.json(
        { error: 'No stages found in pipeline' },
        { status: 500 }
      );
    }

    // Step 3: Get investments
    const investments = await query<any>(`
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

    console.log(`[Setup Pipeline] Found ${investments.length} investments`);

    // Step 4: Create deals
    let createdCount = 0;
    let updatedCount = 0;

    for (const investment of investments) {
      const existingDeal = await queryOne<{ id: string }>(
        'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
        [investment.propertyId]
      );

      if (existingDeal) {
        // Update to ensure it's in New Orleans pipeline
        await query(`
          UPDATE deals 
          SET "pipelineId" = $1, "stageId" = $2, "updatedAt" = NOW()
          WHERE id = $3
        `, [pipelineId, firstStage.id, existingDeal.id]);
        updatedCount++;
        continue;
      }

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
        continue;
      }

      const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const dealType = property.dealStatus === 'UNDER_CONSTRUCTION' ? 'DEVELOPMENT' : 'ACQUISITION';
      const status = property.dealStatus || 'STABILIZED';
      const priority = 'MEDIUM';
      const estimatedValue = property.currentValue || property.totalCost || investment.investmentAmount || 0;
      
      const tags = [];
      if (property.fundingStatus === 'FUNDING') {
        tags.push('FUNDING');
      } else {
        tags.push('FUNDED');
      }
      
      const section = 'ACQUISITIONS';

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
        pipelineId,
        firstStage.id,
        investment.propertyId,
        property.description || null,
        estimatedValue,
        property.acquisitionDate ? new Date(property.acquisitionDate) : null,
        'Auto-created from Investment',
        JSON.stringify(tags),
        section,
      ]);

      createdCount++;
    }

    return NextResponse.json({
      success: true,
      pipelineId,
      created: createdCount,
      updated: updatedCount,
      total: createdCount + updatedCount
    });

  } catch (error: any) {
    console.error('[Setup Pipeline] Error:', error);
    return NextResponse.json(
      { error: 'Failed to setup pipeline', details: error.message },
      { status: 500 }
    );
  }
}

