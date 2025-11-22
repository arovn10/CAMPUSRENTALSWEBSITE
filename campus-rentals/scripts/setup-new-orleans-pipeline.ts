/**
 * Script to create New Orleans pipeline and assign all deals to it
 * Run with: npx ts-node scripts/setup-new-orleans-pipeline.ts
 */

import { query, queryOne } from '../src/lib/db'

async function setupNewOrleansPipeline() {
  try {
    console.log('Setting up New Orleans pipeline...')

    // Check if New Orleans pipeline already exists
    const existingPipeline = await queryOne<{ id: string }>(`
      SELECT id FROM deal_pipelines WHERE name = 'New Orleans' LIMIT 1
    `)

    let pipelineId: string

    if (existingPipeline) {
      console.log('New Orleans pipeline already exists, using existing one')
      pipelineId = existingPipeline.id
    } else {
      // Get a valid user ID for createdBy
      let createdById: string | null = null
      
      // Try to get an admin/manager user
      const adminUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE role = $1 OR role = $2 LIMIT 1',
        ['ADMIN', 'MANAGER']
      )
      createdById = adminUser?.id || null
      
      // If no admin, get first user
      if (!createdById) {
        const firstUser = await queryOne<{ id: string }>(
          'SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1'
        )
        createdById = firstUser?.id || null
      }

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

      pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create pipeline
      if (columnExists?.exists && createdById) {
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, $4, NOW(), NOW())
        `, [pipelineId, 'New Orleans', 'Pipeline for New Orleans deals', createdById])
      } else {
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, NOW(), NOW())
        `, [pipelineId, 'New Orleans', 'Pipeline for New Orleans deals'])
      }

      console.log('Created New Orleans pipeline:', pipelineId)

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
        console.log(`Created stage: ${stage.name}`)
      }
    }

    // Get the first stage of the New Orleans pipeline
    const firstStage = await queryOne<{ id: string }>(`
      SELECT id FROM deal_pipeline_stages 
      WHERE "pipelineId" = $1 
      ORDER BY "order" ASC 
      LIMIT 1
    `, [pipelineId])

    if (!firstStage) {
      throw new Error('No stages found in New Orleans pipeline')
    }

    // Get all deals that don't have a pipeline assigned
    const dealsWithoutPipeline = await query<{ id: string }>(`
      SELECT id FROM deals WHERE "pipelineId" IS NULL
    `)

    console.log(`Found ${dealsWithoutPipeline.length} deals without pipeline`)

    // Assign all deals to New Orleans pipeline
    let assignedCount = 0
    for (const deal of dealsWithoutPipeline) {
      await query(`
        UPDATE deals 
        SET "pipelineId" = $1, "stageId" = $2, "updatedAt" = NOW()
        WHERE id = $3
      `, [pipelineId, firstStage.id, deal.id])
      assignedCount++
    }

    console.log(`Assigned ${assignedCount} deals to New Orleans pipeline`)

    // Also assign deals that might be in other pipelines but should be in New Orleans
    // (based on property address containing "new orleans" or "nola")
    const dealsToReassign = await query<{ id: string }>(`
      SELECT d.id 
      FROM deals d
      LEFT JOIN properties p ON d."propertyId" = p.id
      WHERE (LOWER(p.address) LIKE '%new orleans%' 
         OR LOWER(p.address) LIKE '%nola%'
         OR LOWER(p.address) LIKE '%louisiana%')
        AND (d."pipelineId" IS NULL OR d."pipelineId" != $1)
    `, [pipelineId])

    console.log(`Found ${dealsToReassign.length} deals that should be in New Orleans pipeline`)

    for (const deal of dealsToReassign) {
      await query(`
        UPDATE deals 
        SET "pipelineId" = $1, "stageId" = $2, "updatedAt" = NOW()
        WHERE id = $3
      `, [pipelineId, firstStage.id, deal.id])
      assignedCount++
    }

    console.log(`Total deals assigned to New Orleans pipeline: ${assignedCount}`)
    console.log('✅ New Orleans pipeline setup complete!')

  } catch (error) {
    console.error('Error setting up New Orleans pipeline:', error)
    throw error
  }
}

// Run the script
setupNewOrleansPipeline()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

