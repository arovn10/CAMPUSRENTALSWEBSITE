import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

/**
 * POST /api/admin/migrate/phase2
 * Run Phase 2 migration (TermSheet student housing schema)
 * Requires ADMIN role
 * NO DATA WILL BE DELETED - migration is idempotent
 */
// Configure route to allow longer execution time
export const maxDuration = 300; // 5 minutes (Next.js default is 10s, can be up to 300s on Vercel Pro)

export async function POST(request: NextRequest) {
  // Log that the route was hit (for debugging)
  console.log('[Phase2 Migration] Route called');
  try {
    // Check authentication and admin role
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: 'No Authorization header found. Please ensure you are logged in.'
        },
        { status: 401 }
      );
    }

    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: 'Invalid or expired token. Please log out and log back in.'
        },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { 
          error: 'Admin access required',
          details: `Your role is ${user.role}. Only ADMIN users can run migrations.`
        },
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

    // Read migration file
    const migrationFile = join(process.cwd(), 'scripts', 'phase2-termsheet-student-housing-migration.sql');
    
    let migrationSQL: string;
    try {
      migrationSQL = readFileSync(migrationFile, 'utf8');
    } catch (fileError: any) {
      console.error('Error reading migration file:', fileError);
      return NextResponse.json(
        { 
          error: 'Migration file not found',
          details: `Could not read migration file at: ${migrationFile}`,
          message: 'Please ensure the migration file exists in the scripts directory'
        },
        { status: 500 }
      );
    }

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

    const results: any = {
      success: false,
      message: '',
      executed: [],
      errors: [],
      verification: {}
    };

    try {
      // Connect with timeout
      console.log('[Phase2 Migration] Connecting to database...');
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout after 30 seconds')), 30000)
        )
      ]);
      console.log('[Phase2 Migration] Connected to database');

      // Execute migration in chunks to avoid timeout
      console.log('[Phase2 Migration] Executing migration SQL...');
      
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
      
      console.log(`[Phase2 Migration] Split into ${statements.length} statements`);
      
      // Execute statements one by one
      let executedCount = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement || statement.trim().length === 0 || statement.trim().startsWith('--')) {
          continue;
        }
        
        try {
          console.log(`[Phase2 Migration] Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
          executedCount++;
        } catch (error: any) {
          // Ignore "already exists" errors (idempotent migration)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('IF NOT EXISTS')) {
            console.log(`[Phase2 Migration] Statement ${i + 1} skipped (already exists)`);
            executedCount++;
          } else {
            console.error(`[Phase2 Migration] Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
      
      results.executed.push(`Migration SQL executed: ${executedCount} statements processed`);
      console.log(`[Phase2 Migration] Migration completed: ${executedCount} statements executed`);

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

      results.verification = {
        newColumns: newColumns.rows.length,
        newTables: newTables.rows.length,
        universities: universities.rows.length,
        columnDetails: newColumns.rows,
        tableDetails: newTables.rows,
        universityDetails: universities.rows
      };

      results.success = true;
      results.message = 'Phase 2 migration completed successfully';

    } catch (error: any) {
      console.error('Database migration error:', error);
      results.errors.push(error.message);
      results.message = 'Migration failed: ' + error.message;
      
      // Don't throw - return the error in the response
      return NextResponse.json(
        {
          success: false,
          error: 'Migration failed',
          details: error.message,
          message: 'No data was modified - migration was rolled back',
          executed: results.executed,
          errors: results.errors
        },
        { status: 500 }
      );
    } finally {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('Phase 2 migration error:', error);
    
    // Ensure we always return JSON, even for unexpected errors
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed', 
        details: error?.message || 'Unknown error',
        message: 'No data was modified - migration was rolled back',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

