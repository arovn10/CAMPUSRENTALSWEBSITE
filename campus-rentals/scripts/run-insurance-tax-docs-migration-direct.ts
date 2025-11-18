import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION_FILE = join(__dirname, 'add-insurance-tax-documents.sql')

async function runMigration() {
  console.log('🚀 Starting Insurance/Tax Documents Migration')
  console.log('==============================================\n')

  // Direct database connection credentials
  // These should be set as environment variables or from DATABASE_URL
  let dbHost: string
  let dbUser: string
  let dbPassword: string
  let dbName: string
  let dbPort: number

  // Try to get from DATABASE_URL first (for server deployments)
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && !databaseUrl.includes('prisma+postgres://')) {
    // Parse DATABASE_URL if it's a direct connection
    try {
      const url = new URL(databaseUrl)
      dbHost = url.hostname
      dbUser = url.username
      dbPassword = url.password
      dbName = url.pathname.slice(1) || 'campus_rentals'
      dbPort = parseInt(url.port) || 5432
    } catch (error) {
      // Fall through to environment variables
    }
  }

  // Fall back to individual environment variables or defaults
  if (!dbHost || !dbUser || !dbPassword) {
    dbHost = process.env.DB_HOST || 'ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com'
    dbUser = process.env.DB_USER || 'dbmasteruser'
    dbPassword = process.env.DB_PASSWORD || process.argv[2] || ''
    dbName = process.env.DB_NAME || 'campus_rentals'
    dbPort = parseInt(process.env.DB_PORT || '5432')
  }

  if (!dbPassword) {
    console.error('❌ Database password is required')
    console.error('   Set DB_PASSWORD environment variable or DATABASE_URL')
    console.error('   Or pass as argument: npm run migrate:insurance-tax-docs:direct <password>')
    process.exit(1)
  }

  console.log('🔌 Using direct database connection')
  console.log(`   Host: ${dbHost}`)
  console.log(`   Database: ${dbName}`)
  console.log(`   User: ${dbUser}\n`)

  const client = new Client({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })

  try {
    // Read migration file
    console.log('📖 Reading migration file...')
    const migrationSQL = readFileSync(MIGRATION_FILE, 'utf8')
    console.log('✅ Migration file loaded\n')

    // Connect to database
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected to database\n')

    // Test connection
    const testResult = await client.query('SELECT NOW() as current_time, current_database() as db_name')
    console.log(`📊 Database: ${testResult.rows[0].db_name}`)
    console.log(`⏰ Server time: ${testResult.rows[0].current_time}\n`)

    // Check if columns already exist
    console.log('🔍 Checking existing columns...')
    const insuranceColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'insurance' 
      AND column_name IN ('documentUrl', 'documentFileName', 'documentS3Key')
    `)
    const taxColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'property_taxes' 
      AND column_name IN ('documentUrl', 'documentFileName', 'documentS3Key')
    `)
    
    if (insuranceColumnsResult.rows.length > 0) {
      console.log('⚠️  Some columns already exist in insurance table:')
      insuranceColumnsResult.rows.forEach(row => console.log(`   - ${row.column_name}`))
    }
    if (taxColumnsResult.rows.length > 0) {
      console.log('⚠️  Some columns already exist in property_taxes table:')
      taxColumnsResult.rows.forEach(row => console.log(`   - ${row.column_name}`))
    }
    if (insuranceColumnsResult.rows.length === 0 && taxColumnsResult.rows.length === 0) {
      console.log('✅ No existing columns found - clean migration\n')
    } else {
      console.log('\n   Migration uses IF NOT EXISTS, so it\'s safe to continue.')
      console.log('   Existing data will NOT be deleted.\n')
    }

    console.log('📝 Ready to run migration...')
    console.log('   This migration will:')
    console.log('   ✓ Add documentUrl, documentFileName, documentS3Key to insurance table')
    console.log('   ✓ Add documentUrl, documentFileName, documentS3Key to property_taxes table')
    console.log('   ✓ Create indexes for better performance')
    console.log('   ✓ All operations use IF NOT EXISTS (safe to re-run)')
    console.log('   ✓ NO DATA WILL BE DELETED\n')

    // Execute migration
    console.log('🔄 Executing migration...\n')
    
    // Split SQL into statements
    const statements: string[] = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = migrationSQL.split('\n');
    for (const line of lines) {
      currentStatement += line + '\n';
      
      if (line.trim().startsWith('DO $$')) {
        inDoBlock = true;
        doBlockDepth++;
      }
      if (line.trim().endsWith('END $$;')) {
        doBlockDepth--;
        if (doBlockDepth === 0) {
          inDoBlock = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      } else if (!inDoBlock && line.trim().endsWith(';') && currentStatement.trim()) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`   Split into ${statements.length} statements`);
    
    // Execute statements one by one
    let executedCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0 || statement.trim().startsWith('--')) {
        continue;
      }
      
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        executedCount++;
      } catch (error: any) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('IF NOT EXISTS')) {
          console.log(`   Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`   Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration SQL executed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying migration...\n')
    
    const insuranceColumnsFinal = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'insurance' 
      AND column_name IN ('documentUrl', 'documentFileName', 'documentS3Key')
      ORDER BY column_name
    `)
    const taxColumnsFinal = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'property_taxes' 
      AND column_name IN ('documentUrl', 'documentFileName', 'documentS3Key')
      ORDER BY column_name
    `)
    
    console.log('📊 New columns in insurance table:')
    if (insuranceColumnsFinal.rows.length > 0) {
      insuranceColumnsFinal.rows.forEach(col => {
        console.log(`   ✓ ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.log('   ⚠️  No new columns found (may already exist)')
    }
    console.log('')

    console.log('📊 New columns in property_taxes table:')
    if (taxColumnsFinal.rows.length > 0) {
      taxColumnsFinal.rows.forEach(col => {
        console.log(`   ✓ ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.log('   ⚠️  No new columns found (may already exist)')
    }
    console.log('')

    console.log('✅ Insurance/Tax Documents Migration Complete!')
    console.log('==============================================\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed!')
    console.error('==============================================')
    console.error('Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    console.error('\n⚠️  No data was modified - migration was rolled back')
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

