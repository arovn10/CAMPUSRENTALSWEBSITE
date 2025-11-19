import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/investors/crm/organize-deals-by-location - Organize deals into location-based pipelines
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

    // Get or create location-based pipelines
    const locations = [
      { name: 'New Orleans', keywords: ['new orleans', 'nola', 'louisiana', 'la'], city: 'New Orleans', state: 'LA' },
      { name: 'FAU', keywords: ['fau', 'florida atlantic', 'boca raton', 'boca'], city: 'Boca Raton', state: 'FL' },
    ]

    const pipelineResults: any[] = []

    for (const location of locations) {
      // Check if pipeline exists
      let pipeline = await queryOne<{ id: string; stages: Array<{ id: string; order: number }> }>(`
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
        WHERE p.name = $1
        GROUP BY p.id
        LIMIT 1
      `, [location.name])

      if (!pipeline) {
        // Create pipeline
        const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Check if createdBy column exists
        const columnExists = await queryOne<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'deal_pipelines' 
            AND column_name = 'createdBy'
          ) as exists
        `)

        if (columnExists?.exists) {
          await query(`
            INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, false, $4, NOW(), NOW())
          `, [pipelineId, location.name, `Pipeline for ${location.name} deals`, user.id])
        } else {
          await query(`
            INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, false, NOW(), NOW())
          `, [pipelineId, location.name, `Pipeline for ${location.name} deals`])
        }

        // Create default stages
        const stages = [
          { name: 'New', order: 0, color: '#3B82F6' },
          { name: 'In Progress', order: 1, color: '#F59E0B' },
          { name: 'Closed', order: 2, color: '#10B981' },
        ]

        for (const stage of stages) {
          const stageId = `stage_${Date.now()}_${stage.order}_${Math.random().toString(36).substr(2, 9)}`
          await query(`
            INSERT INTO deal_pipeline_stages (id, "pipelineId", name, "order", color, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `, [stageId, pipelineId, stage.name, stage.order, stage.color])
        }

        // Fetch the created pipeline
        pipeline = await queryOne<{ id: string; stages: Array<{ id: string; order: number }> }>(`
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

      // Find deals that match this location
      const keywordConditions = location.keywords.map((_, idx) => 
        `LOWER(COALESCE(p.address, '')) LIKE $${idx + 2} OR LOWER(COALESCE(p.city, '')) LIKE $${idx + 2} OR LOWER(COALESCE(p."state", '')) LIKE $${idx + 2} OR LOWER(COALESCE(d.name, '')) LIKE $${idx + 2} OR LOWER(COALESCE(d.description, '')) LIKE $${idx + 2}`
      ).join(' OR ')
      
      const keywordParams = location.keywords.map(k => `%${k}%`)
      const deals = await query<{ id: string; propertyId: string | null }>(`
        SELECT d.id, d."propertyId"
        FROM deals d
        LEFT JOIN properties p ON d."propertyId" = p.id
        WHERE (${keywordConditions})
        AND d."pipelineId" != $1
      `, [pipeline.id, ...keywordParams])

      // Update deals to use this pipeline
      let updatedCount = 0
      const firstStage = Array.isArray(pipeline.stages) && pipeline.stages.length > 0
        ? pipeline.stages[0].id
        : null

      for (const deal of deals) {
        await query(`
          UPDATE deals 
          SET "pipelineId" = $1, "stageId" = $2, "updatedAt" = NOW()
          WHERE id = $3
        `, [pipeline.id, firstStage, deal.id])
        updatedCount++
      }

      pipelineResults.push({
        location: location.name,
        pipelineId: pipeline.id,
        dealsMoved: updatedCount,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Deals organized by location',
      results: pipelineResults,
    })
  } catch (error: any) {
    console.error('Error organizing deals by location:', error)
    return NextResponse.json(
      { error: 'Failed to organize deals by location', details: error.message },
      { status: 500 }
    )
  }
}

