/**
 * Run all SQL migrations in prisma/migrations in order.
 * Safe to re-run: uses IF NOT EXISTS / idempotent patterns; skips "already exists" errors.
 * Preserves existing data. Run from project root: npm run db:migrate
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(__dirname, '..', '.env.local') })
config({ path: path.join(__dirname, '..', '.env') })

// Allow passing direct Postgres URL as first CLI arg: npm run db:migrate -- 'postgresql://...'
const cliUrl = process.argv[2]
if (cliUrl && cliUrl.startsWith('postgres')) {
  process.env.DATABASE_URL_DIRECT = cliUrl
}

import { Client } from 'pg'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations')

function getDbConfig(): { host: string; port: number; database: string; user: string; password: string } {
  // Prefer direct URL for migrations (required when DATABASE_URL is Prisma Accelerate)
  const databaseUrl =
    process.env.DATABASE_URL_DIRECT ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL
  const isAccelerate =
    (databaseUrl || '').includes('prisma+postgres://') ||
    (databaseUrl || '').includes('accelerate.prisma-data.net')
  if (databaseUrl && !isAccelerate) {
    try {
      const url = new URL(databaseUrl)
      if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
        return {
          host: url.hostname,
          port: parseInt(url.port || '5432'),
          database: (url.pathname || '/').slice(1) || 'campus_rentals',
          user: url.username || '',
          password: url.password || '',
        }
      }
    } catch (_) {}
  }
  const host = process.env.DB_HOST || process.env.DATABASE_URL_DIRECT_HOST
  const user = process.env.DB_USER || process.env.DATABASE_URL_DIRECT_USER
  const password = process.env.DB_PASSWORD || process.env.DATABASE_URL_DIRECT_PASSWORD
  const database = process.env.DB_NAME || process.env.DATABASE_URL_DIRECT_DB || 'campus_rentals'
  const port = parseInt(process.env.DB_PORT || process.env.DATABASE_URL_DIRECT_PORT || '5432')
  if (host && user && password) {
    return { host, port, database, user, password }
  }
  const hasDbUrl = !!process.env.DATABASE_URL
  const hint = hasDbUrl && isAccelerate
    ? 'DATABASE_URL is Prisma Accelerate; migrations need a direct Postgres URL. '
    : hasDbUrl
      ? 'DATABASE_URL could not be parsed as direct Postgres. '
      : 'No DATABASE_URL set. '
  throw new Error(
    hint +
      'Add one of these to .env and run again: (1) DATABASE_URL_DIRECT="postgresql://USER:PASSWORD@HOST:5432/DATABASE" ' +
      '(2) DIRECT_URL="postgresql://..." (3) DB_HOST, DB_USER, DB_PASSWORD'
  )
}

/** Collect migration files and dirs in run order (001, 002, 003/migration.sql, 003_file, 004, 005, 006, 007/migration.sql, 008, 009) */
function getMigrationPaths(): { name: string; path: string }[] {
  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  const byBase: { base: string; path: string; isDir: boolean }[] = []
  for (const e of entries) {
    const base = e.name.replace(/^(\d+).*$/, '$1')
    if (!/^\d+$/.test(base)) continue
    if (e.isDirectory()) {
      const sqlPath = join(MIGRATIONS_DIR, e.name, 'migration.sql')
      if (existsSync(sqlPath)) byBase.push({ base: e.name, path: sqlPath, isDir: true })
    } else if (e.name.endsWith('.sql')) {
      byBase.push({ base: e.name, path: join(MIGRATIONS_DIR, e.name), isDir: false })
    }
  }
  byBase.sort((a, b) => {
    const aNum = parseInt(a.base.replace(/\D/g, ''), 10) || 0
    const bNum = parseInt(b.base.replace(/\D/g, ''), 10) || 0
    if (aNum !== bNum) return aNum - bNum
    return a.base.localeCompare(b.base)
  })
  return byBase.map(({ base, path }) => ({ name: base, path }))
}

function isSkipError(msg: string): boolean {
  const m = (msg || '').toLowerCase()
  return (
    m.includes('already exists') ||
    m.includes('duplicate') ||
    m.includes('duplicate_object') ||
    m.includes('if not exists')
  )
}

/** Split SQL into statements, keeping DO $$ ... END $$; blocks together */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inDoBlock = false
  const lines = sql.split(/\r?\n/)
  for (const line of lines) {
    current += line + '\n'
    if (line.trim().startsWith('DO $$')) inDoBlock = true
    if (inDoBlock) {
      if (line.trim().endsWith('END $$;')) {
        inDoBlock = false
        const s = current.trim()
        if (s) statements.push(s)
        current = ''
      }
      continue
    }
    if (line.trim().endsWith(';') && !current.trim().startsWith('--')) {
      const s = current.trim()
      if (s) statements.push(s)
      current = ''
    }
  }
  if (current.trim()) statements.push(current.trim())
  return statements.filter((s) => s.length > 0 && !s.replace(/--.*/g, '').trim().startsWith('--'))
}

async function runMigration(client: Client, path: string, name: string): Promise<boolean> {
  const sql = readFileSync(path, 'utf8')
  const statements = splitSqlStatements(sql)
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue
    try {
      await client.query(stmt)
    } catch (err: any) {
      if (isSkipError(err.message)) {
        console.log(`   [skip] ${err.message.slice(0, 80)}...`)
      } else {
        console.error(`   ❌ ${err.message}`)
        return false
      }
    }
  }
  return true
}

async function main() {
  console.log('🔍 Running Prisma migrations (prisma/migrations)...\n')
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error('❌ prisma/migrations directory not found')
    process.exit(1)
  }
  const paths = getMigrationPaths()
  console.log(`📋 Found ${paths.length} migration(s) to run.\n`)
  const config = getDbConfig()
  const needsSsl =
    config.host?.includes('rds.') ||
    config.host?.includes('amazonaws') ||
    config.host?.includes('prisma.io') ||
    (process.env.DATABASE_URL_DIRECT || process.env.DIRECT_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || '').includes('sslmode=require')
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: needsSsl ? { rejectUnauthorized: true } : undefined,
  })
  try {
    await client.connect()
    console.log('✅ Connected to database\n')
    for (const { name, path } of paths) {
      console.log(`📄 ${name}`)
      const ok = await runMigration(client, path, name)
      if (!ok) {
        console.error(`❌ Migration failed: ${name}`)
        process.exit(1)
      }
      console.log(`   ✅ ${name}\n`)
    }
    console.log('✅ All migrations completed.\n')
  } finally {
    await client.end()
  }
  console.log('🔄 Running prisma generate...')
  execSync('npx prisma generate', { stdio: 'inherit', cwd: join(__dirname, '..') })
  console.log('✅ Done. Database is up to date and Prisma client regenerated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
