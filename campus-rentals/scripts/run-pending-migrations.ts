import { Client } from 'pg'
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = join(__dirname)
const MIGRATIONS_LOG_FILE = join(__dirname, '..', '.migrations-log.json')

interface MigrationLog {
  executed: string[]
  lastRun: string
}

function loadMigrationLog(): MigrationLog {
  if (existsSync(MIGRATIONS_LOG_FILE)) {
    try {
      const content = readFileSync(MIGRATIONS_LOG_FILE, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.log('⚠️  Could not parse migrations log, starting fresh')
    }
  }
  return { executed: [], lastRun: new Date().toISOString() }
}

function saveMigrationLog(log: MigrationLog) {
  writeFileSync(MIGRATIONS_LOG_FILE, JSON.stringify(log, null, 2))
}

function getSQLMigrationFiles(): string[] {
  const files = readdirSync(MIGRATIONS_DIR)
  return files
    .filter(file => {
      if (!file.endsWith('.sql')) return false
      // Include files that start with 'add-' or contain 'migration' or 'phase'
      return file.startsWith('add-') || file.includes('migration') || file.includes('phase')
    })
    .sort() // Run in alphabetical order
}

async function runMigration(client: Client, filePath: string, fileName: string): Promise<boolean> {
  console.log(`\n📄 Running migration: ${fileName}`)
  console.log('─'.repeat(50))
  
  try {
    const migrationSQL = readFileSync(filePath, 'utf8')
    
    // Split SQL into statements (handle DO blocks)
    const statements: string[] = []
    let currentStatement = ''
    let inDoBlock = false
    let doBlockDepth = 0
    
    const lines = migrationSQL.split('\n')
    for (const line of lines) {
      currentStatement += line + '\n'
      
      if (line.trim().startsWith('DO $$')) {
        inDoBlock = true
        doBlockDepth++
      }
      if (line.trim().endsWith('END $$;')) {
        doBlockDepth--
        if (doBlockDepth === 0) {
          inDoBlock = false
          statements.push(currentStatement.trim())
          currentStatement = ''
        }
      } else if (!inDoBlock && line.trim().endsWith(';') && currentStatement.trim()) {
        statements.push(currentStatement.trim())
        currentStatement = ''
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim())
    }
    
    console.log(`   Split into ${statements.length} statements`)
    
    let executedCount = 0
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement || statement.trim().length === 0 || statement.trim().startsWith('--')) {
        continue
      }
      
      try {
        await client.query(statement)
        executedCount++
      } catch (error: any) {
        // Ignore "already exists" errors (idempotent migrations)
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('IF NOT EXISTS')) {
          // Skip silently
        } else {
          throw error
        }
      }
    }
    
    console.log(`   ✅ Executed ${executedCount} statements`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🔍 Checking for pending database migrations...')
  console.log('='.repeat(60))
  
  // Get database credentials
  let dbHost: string
  let dbUser: string
  let dbPassword: string
  let dbName: string
  let dbPort: number

  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && !databaseUrl.includes('prisma+postgres://')) {
    try {
      const url = new URL(databaseUrl)
      dbHost = url.hostname
      dbUser = url.username
      dbPassword = url.password
      dbName = url.pathname.slice(1) || 'campus_rentals'
      dbPort = parseInt(url.port) || 5432
    } catch (error) {
      // Fall through
    }
  }

  if (!dbHost || !dbUser || !dbPassword) {
    dbHost = process.env.DB_HOST || 'ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com'
    dbUser = process.env.DB_USER || 'dbmasteruser'
    dbPassword = process.env.DB_PASSWORD || ''
    dbName = process.env.DB_NAME || 'campus_rentals'
    dbPort = parseInt(process.env.DB_PORT || '5432')
  }

  if (!dbPassword) {
    console.error('❌ Database password not found in environment variables')
    console.error('   Set DATABASE_URL or DB_PASSWORD')
    process.exit(1)
  }

  // Load migration log
  const log = loadMigrationLog()
  console.log(`📋 Previously executed migrations: ${log.executed.length}`)
  
  // Get all SQL migration files
  const migrationFiles = getSQLMigrationFiles()
  console.log(`📁 Found ${migrationFiles.length} migration files in scripts directory`)
  
  // Filter to only pending migrations
  const pendingMigrations = migrationFiles.filter(file => !log.executed.includes(file))
  
  if (pendingMigrations.length === 0) {
    console.log('✅ No pending migrations found. Database is up to date!')
    return
  }

  console.log(`\n🔄 Found ${pendingMigrations.length} pending migration(s):`)
  pendingMigrations.forEach(file => console.log(`   - ${file}`))

  // Connect to database
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
    await client.connect()
    console.log('✅ Connected to database\n')

    // Run each pending migration
    const results: { file: string; success: boolean }[] = []
    
    for (const fileName of pendingMigrations) {
      const filePath = join(MIGRATIONS_DIR, fileName)
      const success = await runMigration(client, filePath, fileName)
      results.push({ file: fileName, success })
      
      if (success) {
        // Mark as executed
        log.executed.push(fileName)
        console.log(`   ✅ ${fileName} completed successfully`)
      } else {
        console.error(`   ❌ ${fileName} failed - stopping migration process`)
        break
      }
    }

    // Save updated log
    log.lastRun = new Date().toISOString()
    saveMigrationLog(log)

    // Summary
    console.log('\n' + '='.repeat(60))
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    if (failed === 0) {
      console.log(`✅ All migrations completed successfully! (${successful}/${pendingMigrations.length})`)
    } else {
      console.log(`⚠️  Some migrations failed: ${successful} succeeded, ${failed} failed`)
      process.exit(1)
    }

  } catch (error: any) {
    console.error('\n❌ Migration process failed!')
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

