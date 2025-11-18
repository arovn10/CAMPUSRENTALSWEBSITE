import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { migrationJobs, MigrationJob } from '@/lib/migration-jobs';

/**
 * POST /api/admin/migrate/insurance-tax-docs/start
 * Start the insurance/tax documents migration asynchronously
 */
export async function POST(request: NextRequest) {
  console.log('[Insurance/Tax Docs Migration Start] Route called');
  try {
    const user = await requireAuth(request);
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    // Generate job ID
    const jobId = `migration-insurance-tax-docs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize job status
    const job: MigrationJob = {
      id: jobId,
      status: 'starting',
      progress: 0,
      message: 'Initializing migration...',
      startedAt: new Date().toISOString(),
      completedAt: null,
      results: null,
      error: null
    };
    migrationJobs.set(jobId, job);

    // Start migration in background (don't await)
    runMigrationAsync(jobId, databaseUrl).catch(error => {
      console.error(`[Migration ${jobId}] Error:`, error);
      const job = migrationJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
        job.message = 'Migration failed unexpectedly';
      }
    });

    return NextResponse.json({ 
      success: true,
      jobId, 
      message: 'Migration started successfully' 
    }, { status: 202 }); // 202 Accepted
  } catch (error: any) {
    console.error('Insurance/Tax docs migration start error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to start migration', 
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

// The actual migration logic, run in the background
async function runMigrationAsync(jobId: string, databaseUrl: string) {
  const job = migrationJobs.get(jobId);
  if (!job) return;

  job.status = 'running';
  job.message = 'Reading migration file...';
  job.progress = 5;

  let client: Client | null = null;

  try {
    const migrationFile = join(process.cwd(), 'scripts', 'add-insurance-tax-documents.sql');
    const migrationSQL = readFileSync(migrationFile, 'utf8');

    job.message = 'Connecting to database...';
    job.progress = 10;

    // Parse DATABASE_URL
    const url = new URL(databaseUrl);
    client = new Client({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000,
      query_timeout: 0,
    });

    await client.connect();
    job.message = 'Connected to database. Executing migration...';
    job.progress = 20;

    // Split SQL into statements (handle DO blocks)
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

    const totalStatements = statements.length;
    job.message = `Executing ${totalStatements} SQL statements...`;
    
    let executedCount = 0;
    for (let i = 0; i < totalStatements; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0 || statement.trim().startsWith('--')) {
        continue;
      }
      
      try {
        await client.query(statement);
        executedCount++;
        job.progress = 20 + Math.floor(((i + 1) / totalStatements) * 70); // 20% for connect, 70% for execution
        job.message = `Executing statement ${i + 1}/${totalStatements}...`;
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate') || error.message.includes('IF NOT EXISTS')) {
          // Skip expected errors for idempotent migration
        } else {
          throw error;
        }
      }
    }
    
    job.message = `Migration SQL executed: ${executedCount} statements processed`;
    job.progress = 90;

    // Verify migration
    job.message = 'Verifying migration...';
    const insuranceColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'insurance' 
      AND column_name IN ('documentUrl', 'documentFileName', 'documentS3Key')
      ORDER BY column_name
    `);
    const taxColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'property_taxes' 
      AND column_name IN ('documentUrl', 'documentFileName', 'documentS3Key')
      ORDER BY column_name
    `);

    job.results = {
      insuranceColumns: insuranceColumns.rows.length,
      taxColumns: taxColumns.rows.length,
      insuranceColumnDetails: insuranceColumns.rows,
      taxColumnDetails: taxColumns.rows
    };

    job.status = 'completed';
    job.message = 'Insurance/Tax documents migration completed successfully';
    job.progress = 100;

  } catch (error: any) {
    console.error(`[Migration ${jobId}] Error:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.message = 'Migration failed: ' + error.message;
  } finally {
    job.completedAt = new Date().toISOString();
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error(`[Migration ${jobId}] Error closing connection:`, closeError);
      }
    }
  }
}

