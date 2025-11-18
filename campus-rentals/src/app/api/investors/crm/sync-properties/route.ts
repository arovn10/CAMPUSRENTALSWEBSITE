import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/investors/crm/sync-properties - Automatically sync properties to deals
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get or create default pipeline
    let defaultPipeline = await queryOne<{
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
      WHERE p."isDefault" = true AND p."isActive" = true
      GROUP BY p.id
      LIMIT 1
    `)

    if (!defaultPipeline) {
      // Create default pipeline
      const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await query(`
        INSERT INTO deal_pipelines (id, name, description, "isDefault", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, true, true, NOW(), NOW())
      `, [pipelineId, 'Default Pipeline', 'Default pipeline for all deals'])

      // Create default stages
      const stages = [
        { name: 'New', order: 0, color: '#3B82F6' },
        { name: 'In Progress', order: 1, color: '#F59E0B' },
        { name: 'Closed', order: 2, color: '#10B981' },
      ]

      for (const stage of stages) {
        const stageId = `stage_${Date.now()}_${stage.order}_${Math.random().toString(36).substr(2, 9)}`
        await query(`
          INSERT INTO deal_pipeline_stages (id, "pipelineId", name, "order", color, "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [stageId, pipelineId, stage.name, stage.order, stage.color])
      }

      // Fetch the created pipeline with stages
      defaultPipeline = await queryOne<{
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
      `, [pipelineId]) || { id: pipelineId, stages: [] }
    }

    // Fetch all active properties
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
      occupancyRate: number | null;
      otherIncome: number | null;
      annualExpenses: number | null;
      capRate: number | null;
    }>(`
      SELECT id, name, description, address, "dealStatus", "fundingStatus",
             "currentValue", "totalCost", "acquisitionDate", "occupancyRate",
             "otherIncome", "annualExpenses", "capRate"
      FROM properties
      WHERE "isActive" = true
    `)

    const syncedDeals = []
    const createdDeals = []
    const updatedDeals = []

    for (const property of properties) {
      try {
        // Check if deal already exists for this property
        const existingDeal = await queryOne<{ id: string }>(
          'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
          [property.id]
        )

        // Determine deal type and section
        let dealType = 'ACQUISITION'
        let section = 'ACQUISITION'
        
        if (property.dealStatus === 'UNDER_CONSTRUCTION') {
          dealType = 'DEVELOPMENT'
          section = 'DEVELOPMENT'
        } else if (property.dealStatus === 'STABILIZED' || property.dealStatus === 'SOLD') {
          section = 'ASSET_MANAGEMENT'
        }

        // Determine priority
        let priority = 'MEDIUM'
        if (property.fundingStatus === 'FUNDING') {
          priority = 'HIGH'
        }

        const statusString = property.dealStatus ? String(property.dealStatus) : 'STABILIZED'
        const tags = property.dealStatus ? JSON.stringify([String(property.dealStatus)]) : JSON.stringify([])
        const noi = property.otherIncome && property.annualExpenses 
          ? (property.otherIncome * 12) - property.annualExpenses 
          : null

        if (existingDeal) {
          // Update existing deal
          await query(`
            UPDATE deals SET
              name = $1,
              "dealType" = $2,
              status = $3,
              priority = $4,
              description = $5,
              "estimatedValue" = $6,
              "actualCloseDate" = $7,
              section = $8,
              "budgetedCost" = $9,
              "actualCost" = $10,
              "occupancyRate" = $11,
              noi = $12,
              "capRate" = $13,
              "updatedAt" = NOW()
            WHERE id = $14
          `, [
            property.name,
            dealType,
            statusString,
            priority,
            property.description || null,
            property.currentValue || property.totalCost || null,
            property.dealStatus === 'SOLD' ? property.acquisitionDate : null,
            section,
            property.totalCost || null,
            property.totalCost || null,
            property.occupancyRate || null,
            noi,
            property.capRate || null,
            existingDeal.id,
          ])
          updatedDeals.push(existingDeal.id)
          syncedDeals.push(existingDeal.id)
        } else {
          // Create new deal
          const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const firstStage = Array.isArray(defaultPipeline.stages) && defaultPipeline.stages.length > 0
            ? defaultPipeline.stages[0].id
            : null

          await query(`
            INSERT INTO deals (
              id, name, "dealType", status, priority, "pipelineId", "stageId",
              "propertyId", description, "estimatedValue", "estimatedCloseDate",
              "actualCloseDate", source, tags, section, "budgetedCost", "actualCost",
              "occupancyRate", noi, "capRate", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
            )
          `, [
            dealId,
            property.name,
            dealType,
            statusString,
            priority,
            defaultPipeline.id,
            firstStage,
            property.id,
            property.description || null,
            property.currentValue || property.totalCost || null,
            property.acquisitionDate || null,
            property.dealStatus === 'SOLD' ? property.acquisitionDate : null,
            'Synced from Properties',
            tags,
            section,
            property.totalCost || null,
            property.totalCost || null,
            property.occupancyRate || null,
            noi,
            property.capRate || null,
          ])
          createdDeals.push(dealId)
          syncedDeals.push(dealId)
        }
      } catch (error: any) {
        console.error(`Error syncing property ${property.id} (${property.name}):`, error)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedDeals.length,
      created: createdDeals.length,
      updated: updatedDeals.length,
      message: `Synced ${syncedDeals.length} deals (${createdDeals.length} created, ${updatedDeals.length} updated)`,
    })
  } catch (error: any) {
    console.error('Error syncing properties:', error)
    return NextResponse.json(
      { error: 'Failed to sync properties', details: error.message },
      { status: 500 }
    )
  }
}
