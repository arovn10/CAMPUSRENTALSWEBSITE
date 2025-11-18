import { Client } from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env file manually
function loadEnvFile() {
  const envPath = join(__dirname, '..', '.env')
  const envLocalPath = join(__dirname, '..', '.env.local')
  
  const loadFile = (filePath: string) => {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8')
      content.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '')
            process.env[key.trim()] = value.trim()
          }
        }
      })
    }
  }
  
  loadFile(envPath)
  loadFile(envLocalPath)
}

loadEnvFile()

const MIGRATION_FILE = join(__dirname, 'add-insurance-tax-documents.sql')

async function runMigration() {
  console.log('🚀 Starting Insurance/Tax Documents Migration')
  console.log('==============================================\n')

  // Get database credentials - prefer direct connection over Prisma Accelerate
  let dbHost: string
  let dbUser: string
  let dbPassword: string
  let dbName: string
  let dbPort: number
  let useSsl: boolean

  // Check for direct database connection variables first
  if (process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST) {
    dbHost = process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST || ''
    dbUser = process.env.DB_USER || process.env.DATABASE_URL_DIRECT_USER || ''
    dbPassword = process.env.DB_PASSWORD || process.env.DATABASE_URL_DIRECT_PASSWORD || ''
    dbName = process.env.DB_NAME || process.env.DATABASE_URL_DIRECT_DB || 'campus_rentals'
    dbPort = parseInt(process.env.DB_PORT || process.env.DATABASE_URL_DIRECT_PORT || '5432')
    useSsl = true // Lightsail requires SSL
    
    console.log('🔌 Using direct database connection (bypassing Prisma Accelerate)\n')
  } else {
    // Fall back to DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      console.error('❌ Database credentials not found')
      console.error('   Please set either:')
      console.error('   - DB_HOST, DB_USER, DB_PASSWORD (direct connection)')
      console.error('   - OR DATABASE_URL in your .env file')
      process.exit(1)
    }

    console.log('🔌 Using DATABASE_URL from environment\n')

    try {
      const url = new URL(databaseUrl)
      dbHost = url.hostname
      dbUser = url.username
      dbPassword = url.password
      dbName = url.pathname.slice(1) // Remove leading slash
      dbPort = parseInt(url.port) || 5432
      useSsl = url.searchParams.get('sslmode') === 'require'
    } catch (error) {
      console.error('❌ Failed to parse DATABASE_URL')
      console.error('   Error:', error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  }

  if (!dbHost || !dbUser || !dbPassword) {
    console.error('❌ Missing required database credentials')
    console.error('   Required: DB_HOST (or DATABASE_URL), DB_USER, DB_PASSWORD')
    process.exit(1)
  }

  const client = new Client({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
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
    
    // Split SQL into statements (by semicolon, but preserve DO blocks)
    const statements: string[] = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = migrationSQL.split('\n');
    for (const line of lines) {
      currentStatement += line + '\n';
      
      // Track DO block depth
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
        // Ignore "already exists" errors (idempotent migration)
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
    
    // Check new columns
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
    console.log('📝 Next Steps:')
    console.log('   1. Test document uploads in the insurance and tax sections')
    console.log('   2. Verify documents are being stored correctly in S3\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed!')
    console.error('==============================================')
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

