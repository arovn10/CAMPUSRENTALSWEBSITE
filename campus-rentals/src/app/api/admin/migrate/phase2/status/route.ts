import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { migrationJobs } from '@/lib/migration-jobs';

/**
 * GET /api/admin/migrate/phase2/status?jobId=xxx
 * Get migration job status
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter required' },
        { status: 400 }
      );
    }

    const job = migrationJobs.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found. It may have expired or never existed.' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);

  } catch (error: any) {
    console.error('Error getting migration status:', error);
    return NextResponse.json(
      { error: 'Failed to get migration status', details: error.message },
      { status: 500 }
    );
  }
}

