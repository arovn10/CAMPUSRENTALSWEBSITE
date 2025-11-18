import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { migrationJobs } from '@/lib/migration-jobs';

/**
 * GET /api/admin/migrate/insurance-tax-docs/status?jobId=xxx
 * Get migration job status
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = migrationJobs.get(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error: any) {
    console.error('Error fetching migration status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migration status', details: error.message },
      { status: 500 }
    );
  }
}

