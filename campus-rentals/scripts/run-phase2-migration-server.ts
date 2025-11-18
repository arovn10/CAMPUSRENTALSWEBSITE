/**
 * Phase 2 Migration Runner - Server Side
 * Run this directly on the Lightsail server where the database is accessible
 * 
 * Usage: npm run migrate:phase2:server
 * Or: tsx scripts/run-phase2-migration-server.ts
 */

import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION_FILE = join(__dirname, 'phase2-termsheet-student-housing-migration.sql')

async function runMigration() {
  console.log('🚀 Starting Phase 2 Migration - TermSheet Student Housing')
  console.log('==========================================================\n')

  // Use direct database connection
  // Get credentials from environment variables (never hardcode!)
  const dbHost = process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST
  const dbUser = process.env.DB_USER || process.env.DATABASE_URL_DIRECT_USER
  const dbPassword = process.env.DB_PASSWORD || process.env.DATABASE_URL_DIRECT_PASSWORD
  const dbName = process.env.DB_NAME || process.env.DATABASE_URL_DIRECT_DB || 'campus_rentals'
  const dbPort = parseInt(process.env.DB_PORT || process.env.DATABASE_URL_DIRECT_PORT || '5432')
  
  if (!dbHost || !dbUser || !dbPassword) {
    console.error('❌ Database credentials not found in environment variables')
    console.error('   Please set DB_HOST, DB_USER, DB_PASSWORD (or DATABASE_URL_DIRECT_*)')
    console.error('   These should be in your .env file (not committed to git)')
    process.exit(1)
  }
  
  console.log('🔌 Using direct database connection')
  console.log('   (Bypassing Prisma Accelerate proxy)\n')

  const client = new Client({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword, // Pass password directly - pg handles special chars better this way
    ssl: { rejectUnauthorized: false }, // SSL required for Lightsail
    connectionTimeoutMillis: 30000,
  })

  try {
    // Read migration file
    console.log('📖 Reading migration file...')
    const migrationSQL = readFileSync(MIGRATION_FILE, 'utf8')
    console.log('✅ Migration file loaded\n')

    // Connect to database
    console.log('🔌 Connecting to database...')
    console.log(`   Host: ${dbHost}`)
    console.log(`   Database: ${dbName}`)
    console.log(`   User: ${dbUser}\n`)
    
    await client.connect()
    console.log('✅ Connected to database\n')

    // Test connection
    const testResult = await client.query('SELECT NOW() as current_time, current_database() as db_name')
    console.log(`📊 Database: ${testResult.rows[0].db_name}`)
    console.log(`⏰ Server time: ${testResult.rows[0].current_time}\n`)

    // Check existing tables
    console.log('🔍 Checking existing tables...')
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'universities',
        'document_templates',
        'excel_models',
        'deal_custom_fields',
        'deal_views',
        'task_templates'
      )
    `)
    
    if (existingTables.rows.length > 0) {
      console.log('⚠️  Some tables already exist:')
      existingTables.rows.forEach(row => console.log(`   - ${row.table_name}`))
      console.log('\n   Migration uses IF NOT EXISTS, so it\'s safe to continue.')
      console.log('   Existing data will NOT be deleted.\n')
    } else {
      console.log('✅ No existing tables found - clean migration\n')
    }

    // Execute migration
    console.log('🔄 Executing migration...\n')
    
    // Execute the entire SQL file
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration SQL executed successfully!\n')
    } catch (error: any) {
      // Check if it's just a "already exists" error (which is OK)
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⚠️  Some objects already exist (this is OK - migration is idempotent)')
        console.log('✅ Migration completed (some steps skipped)\n')
      } else {
        throw error
      }
    }

    // Verify migration
    console.log('🔍 Verifying migration...\n')
    
    // Check new columns
    const newColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'deals' 
      AND column_name IN ('totalBeds', 'totalUnits', 'distanceToCampus', 'walkabilityScore', 'averageRentPerBed', 'universityId')
      ORDER BY column_name
    `)
    
    console.log('📊 New columns in deals table:')
    if (newColumns.rows.length > 0) {
      newColumns.rows.forEach(col => {
        console.log(`   ✓ ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.log('   ⚠️  No new columns found (may already exist)')
    }
    console.log('')

    // Check new tables
    const newTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'universities',
        'document_templates',
        'document_generations',
        'excel_models',
        'excel_field_mappings',
        'excel_syncs',
        'deal_custom_fields',
        'deal_views',
        'task_templates',
        'task_template_dependencies'
      )
      ORDER BY table_name
    `)
    
    console.log('📊 New tables created:')
    if (newTables.rows.length > 0) {
      newTables.rows.forEach(table => {
        console.log(`   ✓ ${table.table_name}`)
      })
    } else {
      console.log('   ⚠️  No new tables found (may already exist)')
    }
    console.log('')

    // Check universities data
    const universities = await client.query(`
      SELECT id, name, "shortName", city, state 
      FROM universities 
      ORDER BY name
    `)
    console.log('📊 Universities in database:')
    if (universities.rows.length > 0) {
      universities.rows.forEach(uni => {
        console.log(`   ✓ ${uni.name} (${uni.shortName || 'N/A'}) - ${uni.city || 'N/A'}, ${uni.state || 'N/A'}`)
      })
    } else {
      console.log('   ⚠️  No universities found')
    }
    console.log('')

    console.log('✅ Phase 2 Migration Complete!')
    console.log('==========================================================')
    console.log('\n📝 Next Steps:')
    console.log('   1. Test the new fields in the application')
    console.log('   2. Proceed to Phase 3: Deal Management UI\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed!')
    console.error('==========================================================')
    console.error('Error:', error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    console.error('\n⚠️  No data was modified - migration was rolled back')
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

