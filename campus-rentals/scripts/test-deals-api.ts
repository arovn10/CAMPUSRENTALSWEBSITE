/**
 * Test script to verify deals API is working
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

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
    throw new Error('Database credentials not found');
  }

  return { host, port, database, user, password };
}

async function query(sql: string, params: any[] = []): Promise<any[]> {
  const config = getDbConfig();
  const client = new Client({
    ...config,
    ssl: { rejectUnauthorized: false },
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

async function testDealsAPI() {
  try {
    console.log('🧪 Testing Deals API Setup...\n');

    // Test 1: Check if New Orleans pipeline exists
    console.log('📋 Test 1: Checking New Orleans pipeline...');
    const pipeline = await queryOne<{ id: string; name: string }>(`
      SELECT id, name FROM deal_pipelines WHERE name = 'New Orleans' LIMIT 1
    `);
    
    if (pipeline) {
      console.log(`✅ New Orleans pipeline exists: ${pipeline.id}`);
    } else {
      console.log('❌ New Orleans pipeline NOT found');
      return;
    }

    // Test 2: Check if pipeline has stages
    console.log('\n📋 Test 2: Checking pipeline stages...');
    const stages = await query<{ id: string; name: string; order: number }>(`
      SELECT id, name, "order" 
      FROM deal_pipeline_stages 
      WHERE "pipelineId" = $1 
      ORDER BY "order" ASC
    `, [pipeline.id]);
    
    console.log(`✅ Found ${stages.length} stages:`);
    stages.forEach(stage => {
      console.log(`   - ${stage.name} (order: ${stage.order})`);
    });

    // Test 3: Check investments
    console.log('\n📊 Test 3: Checking investments...');
    const investments = await query(`
      SELECT COUNT(*) as count FROM investments
    `);
    console.log(`✅ Found ${investments[0].count} investments`);

    // Test 4: Check deals
    console.log('\n💼 Test 4: Checking deals...');
    const deals = await query(`
      SELECT COUNT(*) as count FROM deals
    `);
    console.log(`✅ Found ${deals[0].count} deals`);

    // Test 5: Check deals in New Orleans pipeline
    console.log('\n💼 Test 5: Checking deals in New Orleans pipeline...');
    const pipelineDeals = await query(`
      SELECT COUNT(*) as count 
      FROM deals 
      WHERE "pipelineId" = $1
    `, [pipeline.id]);
    console.log(`✅ Found ${pipelineDeals[0].count} deals in New Orleans pipeline`);

    // Test 6: Test the actual query used by the API
    console.log('\n🔍 Test 6: Testing API query...');
    try {
      const testDeals = await query(`
        SELECT 
          d.id,
          d.name,
          d."dealType",
          d.status,
          d."pipelineId",
          d."stageId",
          d."propertyId",
          p.name as "pipeline_name",
          s.name as "stage_name",
          prop.name as "property_name"
        FROM deals d
        LEFT JOIN deal_pipelines p ON d."pipelineId" = p.id
        LEFT JOIN deal_pipeline_stages s ON d."stageId" = s.id
        LEFT JOIN properties prop ON d."propertyId" = prop.id
        WHERE d."pipelineId" = $1
        ORDER BY d."createdAt" DESC
        LIMIT 5
      `, [pipeline.id]);
      
      console.log(`✅ Query executed successfully, found ${testDeals.length} deals:`);
      testDeals.forEach((deal: any) => {
        console.log(`   - ${deal.name} (${deal.property_name || 'No property'})`);
      });
    } catch (error: any) {
      console.error('❌ Query failed:', error.message);
      console.error('Error details:', error);
    }

    // Test 7: Check if investments have corresponding deals
    console.log('\n🔗 Test 7: Checking investment-deal mapping...');
    const investmentDeals = await query(`
      SELECT 
        i.id as "investment_id",
        i."propertyId",
        d.id as "deal_id",
        d.name as "deal_name"
      FROM investments i
      LEFT JOIN deals d ON i."propertyId" = d."propertyId"
      LIMIT 5
    `);
    
    console.log(`✅ Sample investment-deal mappings:`);
    investmentDeals.forEach((item: any) => {
      if (item.deal_id) {
        console.log(`   ✅ Investment ${item.investment_id} → Deal ${item.deal_name}`);
      } else {
        console.log(`   ⚠️  Investment ${item.investment_id} → No deal found`);
      }
    });

    console.log('\n✅ All tests completed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error?.stack);
    process.exit(1);
  }
}

testDealsAPI()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });

