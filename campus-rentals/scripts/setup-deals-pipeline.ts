/**
 * Setup script to:
 * 1. Create New Orleans pipeline if it doesn't exist
 * 2. Create deals from all investments
 * 3. Assign deals to New Orleans pipeline
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Database connection helper
function getDbConfig() {
  let host = process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST;
  let user = process.env.DB_USER || process.env.DATABASE_URL_DIRECT_USER;
  let password = process.env.DB_PASSWORD || process.env.DATABASE_URL_DIRECT_PASSWORD;
  let database = process.env.DB_NAME || process.env.DATABASE_URL_DIRECT_DB || 'campus_rentals';
  let port = parseInt(process.env.DB_PORT || process.env.DATABASE_URL_DIRECT_PORT || '5432');

  if ((!host || !user || !password) && process.env.DATABASE_URL) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl.includes('prisma+postgres://') && !databaseUrl.includes('accelerate.prisma-data.net')) {
      try {
        const url = new URL(databaseUrl);
        if (!host) host = url.hostname;
        if (!user) user = url.username;
        if (!password) password = url.password;
        if (!database || database === 'campus_rentals') {
          database = url.pathname.slice(1) || 'campus_rentals';
        }
        if (!port || port === 5432) {
          port = parseInt(url.port) || 5432;
        }
      } catch (e) {
        console.error('Error parsing DATABASE_URL:', e);
      }
    }
  }

  if (!host || !user || !password) {
    const errorMsg = 'Database credentials not found. ' +
      'Set DB_HOST, DB_USER, DB_PASSWORD (or DATABASE_URL_DIRECT_*) environment variables.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { host, port, database, user, password };
}

async function query(sql: string, params: any[] = []): Promise<any[]> {
  const config = getDbConfig();
  const client = new Client({
    ...config,
    ssl: { rejectUnauthorized: false }, // SSL required for AWS/Lightsail
    connectionTimeoutMillis: 30000,
  });
  try {
    await client.connect();
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await query(sql, params);
  return results.length > 0 ? (results[0] as T) : null;
}

async function setupDealsPipeline() {
  try {
    console.log('🚀 Starting deals pipeline setup...');

    // Step 1: Get or create New Orleans pipeline
    console.log('📋 Step 1: Checking for New Orleans pipeline...');
    let pipeline = await queryOne<{ id: string }>(`
      SELECT id FROM deal_pipelines WHERE name = 'New Orleans' LIMIT 1
    `);

    let pipelineId: string;
    if (!pipeline) {
      console.log('📋 Creating New Orleans pipeline...');
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

      // Get an admin user for createdBy if needed
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

      console.log(`✅ Created New Orleans pipeline: ${pipelineId}`);
    } else {
      pipelineId = pipeline.id;
      console.log(`✅ New Orleans pipeline already exists: ${pipelineId}`);
    }

    // Step 2: Get first stage of pipeline
    const firstStage = await queryOne<{ id: string }>(`
      SELECT id FROM deal_pipeline_stages 
      WHERE "pipelineId" = $1 
      ORDER BY "order" ASC 
      LIMIT 1
    `, [pipelineId]);

    if (!firstStage) {
      throw new Error('No stages found in New Orleans pipeline');
    }

    // Step 3: Get all investments with properties
    console.log('📊 Step 2: Fetching investments...');
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

    console.log(`📊 Found ${investments.length} investments`);

    // Step 4: Create deals from investments
    console.log('💼 Step 3: Creating deals from investments...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const investment of investments) {
      // Check if deal already exists
      const existingDeal = await queryOne<{ id: string }>(
        'SELECT id FROM deals WHERE "propertyId" = $1 LIMIT 1',
        [investment.propertyId]
      );

      if (existingDeal) {
        // Update existing deal to ensure it's in New Orleans pipeline
        await query(`
          UPDATE deals 
          SET "pipelineId" = $1, "stageId" = $2, "updatedAt" = NOW()
          WHERE id = $3
        `, [pipelineId, firstStage.id, existingDeal.id]);
        skippedCount++;
        continue;
      }

      // Create new deal
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
        console.log(`⚠️ Skipping investment ${investment.id} - no property`);
        skippedCount++;
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
      console.log(`✅ Created deal ${dealId} for property ${investment.propertyId}`);
    }

    console.log(`\n🎉 Setup complete!`);
    console.log(`   - Pipeline: ${pipelineId}`);
    console.log(`   - Deals created: ${createdCount}`);
    console.log(`   - Deals updated: ${skippedCount}`);
    console.log(`   - Total deals: ${createdCount + skippedCount}`);

  } catch (error: any) {
    console.error('❌ Error setting up deals pipeline:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    process.exit(1);
  }
}

// Run the script
setupDealsPipeline()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

