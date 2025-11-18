import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { migrationJobs, MigrationJob } from '@/lib/migration-jobs';

/**
 * POST /api/admin/migrate/phase2/start
 * Start Phase 2 migration asynchronously
 * Returns immediately with job ID
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await requireAuth(request);
    
    if (!user || user.role !== 'ADMIN') {
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
    const jobId = `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
      }
    });

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Migration started. Use the status endpoint to check progress.',
      statusUrl: `/api/admin/migrate/phase2/status?jobId=${jobId}`
    });

  } catch (error: any) {
    console.error('Error starting migration:', error);
    return NextResponse.json(
      { error: 'Failed to start migration', details: error.message },
      { status: 500 }
    );
  }
}

async function runMigrationAsync(jobId: string, databaseUrl: string) {
  const job = migrationJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.message = 'Reading migration file...';
    job.progress = 5;

    // Read migration file
    const migrationFile = join(process.cwd(), 'scripts', 'phase2-termsheet-student-housing-migration.sql');
    const migrationSQL = readFileSync(migrationFile, 'utf8');

    job.message = 'Connecting to database...';
    job.progress = 10;

    // Parse DATABASE_URL
    const url = new URL(databaseUrl);
    const client = new Client({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
    });

    await client.connect();
    job.message = 'Connected to database. Executing migration...';
    job.progress = 15;

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

    const totalStatements = statements.length;
    job.message = `Executing ${totalStatements} SQL statements...`;
    
    // Execute statements one by one
    let executedCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0 || statement.trim().startsWith('--')) {
        continue;
      }
      
      try {
        await client.query(statement);
        executedCount++;
      } catch (error: any) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('IF NOT EXISTS')) {
          executedCount++;
        } else {
          throw error;
        }
      }
      
      // Update progress
      const progress = 15 + Math.floor((executedCount / totalStatements) * 70);
      job.progress = Math.min(progress, 85);
      job.message = `Executed ${executedCount}/${totalStatements} statements...`;
    }

    job.message = 'Verifying migration...';
    job.progress = 85;

    // Verify migration
    const newColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'deals' 
      AND column_name IN ('totalBeds', 'totalUnits', 'distanceToCampus', 'walkabilityScore', 'averageRentPerBed', 'universityId')
      ORDER BY column_name
    `);

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
    `);

    const universities = await client.query(`
      SELECT id, name, "shortName", city, state 
      FROM universities 
      ORDER BY name
    `);

    job.progress = 100;
    job.status = 'completed';
    job.message = 'Migration completed successfully!';
    job.completedAt = new Date().toISOString();
    job.results = {
      success: true,
      executed: [`Migration SQL executed: ${executedCount} statements processed`],
      verification: {
        newColumns: newColumns.rows.length,
        newTables: newTables.rows.length,
        universities: universities.rows.length,
        columnDetails: newColumns.rows,
        tableDetails: newTables.rows,
        universityDetails: universities.rows
      }
    };

    await client.end();

  } catch (error: any) {
    console.error(`[Migration ${jobId}] Error:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.message = `Migration failed: ${error.message}`;
    job.completedAt = new Date().toISOString();
  }
}

// Export job storage for status endpoint
export { migrationJobs };

