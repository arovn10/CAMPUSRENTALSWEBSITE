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
    let defaultPipeline: { id: string; stages: Array<{ id: string; order: number }> } | null = null
    try {
      defaultPipeline = await queryOne<{
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
    } catch (error: any) {
      console.error('Error fetching default pipeline:', error)
      throw new Error(`Failed to fetch default pipeline: ${error?.message || error}`)
    }

    if (!defaultPipeline) {
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
      
      // Create default pipeline
      const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Always get a valid user ID for createdBy (required if column exists)
      // Try multiple strategies to find a valid user ID
      let createdById: string | null = null
      
      console.log('[SYNC-INVESTMENTS] Looking for user for createdBy. Auth user:', { id: user.id, email: (user as any).email, role: user.role })
      
      // Strategy 1: Try to find user by ID (from requireAuth) - this should work since user is authenticated
      if (user.id) {
        try {
          const dbUserById = await queryOne<{ id: string }>(
            'SELECT id FROM users WHERE id = $1 LIMIT 1',
            [user.id]
          )
          if (dbUserById?.id) {
            createdById = dbUserById.id
            console.log('[SYNC-INVESTMENTS] Found user by ID:', createdById)
          }
        } catch (error) {
          console.error('[SYNC-INVESTMENTS] Error finding user by ID:', error)
        }
      }
      
      // Strategy 2: Try to find user by email
      if (!createdById && (user as any).email) {
        try {
          const dbUserByEmail = await queryOne<{ id: string }>(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [(user as any).email]
          )
          if (dbUserByEmail?.id) {
            createdById = dbUserByEmail.id
            console.log('[SYNC-INVESTMENTS] Found user by email:', createdById)
          }
        } catch (error) {
          console.error('[SYNC-INVESTMENTS] Error finding user by email:', error)
        }
      }
      
      // Strategy 3: Get any admin/manager user
      if (!createdById) {
        try {
          const adminUser = await queryOne<{ id: string }>(
            'SELECT id FROM users WHERE role = $1 OR role = $2 LIMIT 1',
            ['ADMIN', 'MANAGER']
          )
          if (adminUser?.id) {
            createdById = adminUser.id
            console.log('[SYNC-INVESTMENTS] Found admin/manager user:', createdById)
          }
        } catch (error) {
          console.error('[SYNC-INVESTMENTS] Error finding admin/manager user:', error)
        }
      }
      
      // Strategy 4: Get the first user in the system
      if (!createdById) {
        try {
          const firstUser = await queryOne<{ id: string }>(
            'SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1'
          )
          if (firstUser?.id) {
            createdById = firstUser.id
            console.log('[SYNC-INVESTMENTS] Found first user in system:', createdById)
          }
        } catch (error) {
          console.error('[SYNC-INVESTMENTS] Error finding first user:', error)
        }
      }
      
      // Strategy 5: Check if users table has any records at all
      if (!createdById) {
        try {
          const userCount = await queryOne<{ count: string }>(
            'SELECT COUNT(*)::text as count FROM users'
          )
          console.log('[SYNC-INVESTMENTS] Total users in database:', userCount?.count || '0')
        } catch (error) {
          console.error('[SYNC-INVESTMENTS] Error counting users:', error)
        }
      }
      
      // If createdBy column exists, we MUST have a user ID that exists in the database
      if (columnExists?.exists) {
        if (!createdById) {
          console.error('[SYNC-INVESTMENTS] CRITICAL: No user found for createdBy field. Column exists but no user available.')
          return NextResponse.json(
            { 
              error: 'Failed to sync investments: No user found for createdBy field. Please ensure at least one user exists in the system.',
              details: `Authenticated user ID: ${user.id || 'N/A'}, Email: ${(user as any).email || 'N/A'}, Role: ${user.role || 'N/A'}. The authenticated user ID does not exist in the database.`
            },
            { status: 500 }
          )
        }
        
        // Verify the user ID exists in the database before using it (to avoid foreign key constraint violations)
        try {
          const verifyUser = await queryOne<{ id: string }>(
            'SELECT id FROM users WHERE id = $1 LIMIT 1',
            [createdById]
          )
          if (!verifyUser) {
            console.error('[SYNC-INVESTMENTS] User ID does not exist in database:', createdById)
            return NextResponse.json(
              { 
                error: 'Failed to sync investments: User ID found but does not exist in database.',
                details: `User ID: ${createdById}`
              },
              { status: 500 }
            )
          }
        } catch (error) {
          console.error('[SYNC-INVESTMENTS] Error verifying user ID:', error)
          return NextResponse.json(
            { 
              error: 'Failed to sync investments: Error verifying user ID.',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          )
        }
        
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, true, $4, NOW(), NOW())
        `, [pipelineId, 'Default Pipeline', 'Default pipeline for all deals', createdById])
      } else {
        // Column doesn't exist, create without createdBy
        await query(`
          INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, true, NOW(), NOW())
        `, [pipelineId, 'Default Pipeline', 'Default pipeline for all deals'])
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

    // Ensure we have a valid default pipeline
    if (!defaultPipeline) {
      throw new Error('Failed to get or create default pipeline')
    }

    // Fetch all investments with their properties - including ALL property attributes
    // This ensures deals have all the same data as the investor dashboard
    let investments: Array<{
      id: string;
      userId: string;
      propertyId: string;
      investmentAmount: number | null;
      currentValue: number | null;
      status: string;
      investmentDate: Date | null;
      propertyName: string;
      propertyAddress: string | null;
      propertyCity: string | null;
      propertyState: string | null;
      propertyDescription: string | null;
      propertyDealStatus: string | null;
      propertyFundingStatus: string | null;
      // All property attributes for investor dashboard display
      bedrooms: number | null;
      bathrooms: number | null;
      squareFeet: number | null;
      monthlyRent: number | null;
      otherIncome: number | null;
      annualExpenses: number | null;
      capRate: number | null;
      acquisitionDate: Date | null;
      acquisitionPrice: number | null;
      constructionCost: number | null;
      totalCost: number | null;
      debtAmount: number | null;
      occupancyRate: number | null;
      propertyType: string | null;
    }> = []
    
    try {
      investments = await query<{
        id: string;
        userId: string;
        propertyId: string;
        investmentAmount: number | null;
        currentValue: number | null;
        status: string;
        investmentDate: Date | null;
        propertyName: string;
        propertyAddress: string | null;
        propertyCity: string | null;
        propertyState: string | null;
        propertyDescription: string | null;
        propertyDealStatus: string | null;
        propertyFundingStatus: string | null;
        bedrooms: number | null;
        bathrooms: number | null;
        squareFeet: number | null;
        monthlyRent: number | null;
        otherIncome: number | null;
        annualExpenses: number | null;
        capRate: number | null;
        acquisitionDate: Date | null;
        acquisitionPrice: number | null;
        constructionCost: number | null;
        totalCost: number | null;
        debtAmount: number | null;
        occupancyRate: number | null;
        propertyType: string | null;
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
          NULL as "propertyCity",
          NULL as "propertyState",
          p.description as "propertyDescription",
          COALESCE(p."dealStatus"::text, 'STABILIZED') as "propertyDealStatus",
          COALESCE(p."fundingStatus"::text, 'FUNDED') as "propertyFundingStatus",
          COALESCE(p."currentValue", p."totalCost", i."investmentAmount") as "currentValue",
          -- All property attributes for investor dashboard
          p.bedrooms,
          p.bathrooms,
          p."squareFeet",
          p."monthlyRent",
          p."otherIncome",
          p."annualExpenses",
          p."capRate",
          p."acquisitionDate",
          p."acquisitionPrice",
          p."constructionCost",
          p."totalCost",
          p."debtAmount",
          p."occupancyRate",
          p."propertyType"::text as "propertyType"
        FROM investments i
        INNER JOIN properties p ON i."propertyId" = p.id
      `)
    } catch (error: any) {
      console.error('Error fetching investments:', error)
      throw new Error(`Failed to fetch investments: ${error?.message || error}`)
    }

    // Helper function to get or create location-based pipeline
    const getLocationPipeline = async (address: string | null, city: string | null, state: string | null): Promise<{ id: string; stages: Array<{ id: string; order: number }> } | null> => {
      if (!address && !city && !state) return null
      
      const addressLower = (address || '').toLowerCase()
      const cityLower = (city || '').toLowerCase()
      const stateLower = (state || '').toLowerCase()
      
      let locationName: string | null = null
      
      // Check for New Orleans
      if (addressLower.includes('new orleans') || addressLower.includes('nola') || 
          cityLower.includes('new orleans') || stateLower === 'la' || stateLower === 'louisiana') {
        locationName = 'New Orleans'
      }
      // Check for FAU
      else if (addressLower.includes('fau') || addressLower.includes('florida atlantic') || 
               addressLower.includes('boca raton') || addressLower.includes('boca') ||
               cityLower.includes('boca raton') || cityLower.includes('boca')) {
        locationName = 'FAU'
      }
      
      if (!locationName) return null
      
      // Find existing location pipeline
      let locationPipeline = await queryOne<{ id: string; stages: Array<{ id: string; order: number }> }>(`
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
      `, [locationName])
      
      // If pipeline doesn't exist, create it (but don't fail if we can't - just return null and use default)
      if (!locationPipeline) {
        try {
          // Get user ID for createdBy (same logic as default pipeline)
          const columnExists = await queryOne<{ exists: boolean }>(`
            SELECT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_schema = 'public'
              AND table_name = 'deal_pipelines' 
              AND column_name = 'createdBy'
            ) as exists
          `)
          
          // Use the same user lookup logic as default pipeline creation
          let createdById: string | null = null
          
          // Strategy 1: Try to find user by ID
          if (user.id) {
            try {
              const dbUserById = await queryOne<{ id: string }>(
                'SELECT id FROM users WHERE id = $1 LIMIT 1',
                [user.id]
              )
              createdById = dbUserById?.id || null
            } catch (error) {
              console.error('[SYNC-INVESTMENTS] Error finding user by ID in location pipeline:', error)
            }
          }
          
          // Strategy 2: Try to find user by email
          if (!createdById && (user as any).email) {
            try {
              const dbUserByEmail = await queryOne<{ id: string }>(
                'SELECT id FROM users WHERE email = $1 LIMIT 1',
                [(user as any).email]
              )
              createdById = dbUserByEmail?.id || null
            } catch (error) {
              console.error('[SYNC-INVESTMENTS] Error finding user by email in location pipeline:', error)
            }
          }
          
          // Strategy 3: Get any admin/manager user
          if (!createdById) {
            try {
              const adminUser = await queryOne<{ id: string }>(
                'SELECT id FROM users WHERE role = $1 OR role = $2 LIMIT 1',
                ['ADMIN', 'MANAGER']
              )
              createdById = adminUser?.id || null
            } catch (error) {
              console.error('[SYNC-INVESTMENTS] Error finding admin/manager user in location pipeline:', error)
            }
          }
          
          // Strategy 4: Get the first user in the system
          if (!createdById) {
            try {
              const firstUser = await queryOne<{ id: string }>(
                'SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1'
              )
              createdById = firstUser?.id || null
            } catch (error) {
              console.error('[SYNC-INVESTMENTS] Error finding first user in location pipeline:', error)
            }
          }
          
          // Only create if we have a user ID (if column exists) or if column doesn't exist
          // If column exists but no user found, skip creating this location pipeline (fall back to default)
          if (!columnExists?.exists || createdById) {
            // Verify the user ID exists in the database before using it
            if (columnExists?.exists && createdById) {
              try {
                const verifyUser = await queryOne<{ id: string }>(
                  'SELECT id FROM users WHERE id = $1 LIMIT 1',
                  [createdById]
                )
                if (!verifyUser) {
                  console.error('[SYNC-INVESTMENTS] User ID does not exist in database for location pipeline:', createdById)
                  // Skip creating this location pipeline, will fall back to default
                  return null
                }
              } catch (error) {
                console.error('[SYNC-INVESTMENTS] Error verifying user ID for location pipeline:', error)
                // Skip creating this location pipeline, will fall back to default
                return null
              }
            }
            
            const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            if (columnExists?.exists && createdById) {
              await query(`
                INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdBy", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, false, $4, NOW(), NOW())
              `, [pipelineId, locationName, `Pipeline for ${locationName} deals`, createdById])
            } else if (!columnExists?.exists) {
              await query(`
                INSERT INTO deal_pipelines (id, name, description, "isDefault", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, false, NOW(), NOW())
              `, [pipelineId, locationName, `Pipeline for ${locationName} deals`])
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
            locationPipeline = await queryOne<{ id: string; stages: Array<{ id: string; order: number }> }>(`
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
        } catch (error) {
          console.error(`Error creating location pipeline for ${locationName}:`, error)
          // Return null to fall back to default pipeline
          return null
        }
      }
      
      return locationPipeline || null
    }

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
          // Determine location-based pipeline
          const locationPipeline = await getLocationPipeline(
            investment.propertyAddress,
            investment.propertyCity,
            investment.propertyState
          )
          
          // Use location pipeline if found, otherwise use default
          const targetPipeline = locationPipeline || defaultPipeline
          if (!targetPipeline) {
            console.error(`No pipeline available for investment ${investment.id}`)
            continue // Skip this investment if no pipeline is available
          }
          const firstStage = Array.isArray(targetPipeline.stages) && targetPipeline.stages.length > 0
            ? targetPipeline.stages[0].id
            : null

          // Create new deal from investment
          const dealId = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
            targetPipeline.id,
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
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorStack = error?.stack || ''
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to sync investments', 
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

