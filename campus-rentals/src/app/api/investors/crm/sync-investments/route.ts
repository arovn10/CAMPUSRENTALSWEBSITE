import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/investors/crm/sync-investments - Sync investments to deals
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
        p.id,
        p.name,
        p.description,
        p."isDefault",
        COALESCE(
          jsonb_agg(
            jsonb_build_object('id', s.id, 'order', s."order")
            ORDER BY s."order" ASC
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::jsonb
        ) as stages
      FROM deal_pipelines p
      LEFT JOIN deal_pipeline_stages s ON p.id = s."pipelineId"
      WHERE p."isDefault" = true
      GROUP BY p.id, p.name, p.description, p."isDefault"
      LIMIT 1
    `)

    if (!defaultPipeline) {
      // Create default pipeline
      const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await query(`
        INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, true, NOW(), NOW())
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
      `, [pipelineId]) || { id: pipelineId, stages: [] }
    }

    // Fetch all investments with their properties
    // Using COALESCE to handle potentially missing columns gracefully
    const investments = await query<{
      id: string;
      userId: string;
      propertyId: string;
      investmentAmount: number | null;
      currentValue: number | null;
      status: string;
      investmentDate: Date | null;
      propertyName: string;
      propertyAddress: string | null;
      propertyDescription: string | null;
      propertyDealStatus: string | null;
      propertyFundingStatus: string | null;
    }>(`
      SELECT 
        i.id,
        i."userId",
        i."propertyId",
        i."investmentAmount",
        i.status,
        i."investmentDate",
        p.name as "propertyName",
        p.address as "propertyAddress",
        p.description as "propertyDescription",
        COALESCE(p."dealStatus"::text, 'STABILIZED') as "propertyDealStatus",
        COALESCE(p."fundingStatus"::text, 'FUNDED') as "propertyFundingStatus",
        COALESCE(p."currentValue", p."totalCost", i."investmentAmount") as "currentValue"
      FROM investments i
      INNER JOIN properties p ON i."propertyId" = p.id
    `)

    const syncedDeals = []
    const createdDeals = []
    const updatedDeals = []

    for (const investment of investments) {
      try {
        // Check if deal already exists for this investment/property combination
        const existingDeal = await queryOne<{ id: string }>(
          'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
          [investment.propertyId]
        )

        // Determine deal type and section
        let dealType = 'ACQUISITION'
        let section = 'ACQUISITION'
        
        if (investment.propertyDealStatus === 'UNDER_CONSTRUCTION') {
          dealType = 'DEVELOPMENT'
          section = 'DEVELOPMENT'
        } else if (investment.propertyDealStatus === 'STABILIZED' || investment.propertyDealStatus === 'SOLD') {
          section = 'ASSET_MANAGEMENT'
        }

        // Determine priority
        let priority = 'MEDIUM'
        if (investment.propertyFundingStatus === 'FUNDING') {
          priority = 'HIGH'
        } else if (investment.status === 'PENDING') {
          priority = 'HIGH'
        }

        // Determine status
        let status = 'STABILIZED'
        if (investment.status === 'PENDING') {
          status = 'NEW'
        } else if (investment.status === 'CLOSED') {
          status = 'CLOSED'
        } else if (investment.propertyDealStatus) {
          status = String(investment.propertyDealStatus)
        }

        const tags = investment.status ? JSON.stringify([investment.status]) : JSON.stringify([])
        const estimatedValue = investment.currentValue || investment.investmentAmount || null

        if (existingDeal) {
          // Update existing deal with investment data
          await query(`
            UPDATE deals SET
              name = $1,
              "dealType" = $2,
              status = $3,
              priority = $4,
              description = $5,
              "estimatedValue" = $6,
              "estimatedCloseDate" = $7,
              "updatedAt" = NOW()
            WHERE id = $8
          `, [
            investment.propertyName,
            dealType,
            status,
            priority,
            investment.propertyDescription || null,
            estimatedValue,
            investment.investmentDate || null,
            existingDeal.id,
          ])
          updatedDeals.push(existingDeal.id)
          syncedDeals.push(existingDeal.id)
        } else {
          // Create new deal from investment
          const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const firstStage = Array.isArray(defaultPipeline.stages) && defaultPipeline.stages.length > 0
            ? defaultPipeline.stages[0].id
            : null

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
            investment.propertyName,
            dealType,
            status,
            priority,
            defaultPipeline.id,
            firstStage,
            investment.propertyId,
            investment.propertyDescription || null,
            estimatedValue,
            investment.investmentDate || null,
            'Synced from Investments',
            tags,
            section,
          ])
          createdDeals.push(dealId)
          syncedDeals.push(dealId)
        }
      } catch (error: any) {
        console.error(`Error syncing investment ${investment.id} (${investment.propertyName}):`, error)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedDeals.length,
      created: createdDeals.length,
      updated: updatedDeals.length,
      message: `Synced ${syncedDeals.length} deals from investments (${createdDeals.length} created, ${updatedDeals.length} updated)`,
    })
  } catch (error: any) {
    console.error('Error syncing investments:', error)
    return NextResponse.json(
      { error: 'Failed to sync investments', details: error.message },
      { status: 500 }
    )
  }
}

