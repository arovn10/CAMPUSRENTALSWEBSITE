import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/migrate/phase2
 * DEPRECATED: This route has been replaced with the async version
 * Use /api/admin/migrate/phase2/start instead
 * 
 * This file exists to prevent 404 errors if something still calls the old endpoint
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint has been deprecated',
      message: 'Please use /api/admin/migrate/phase2/start for async migration',
      newEndpoint: '/api/admin/migrate/phase2/start'
    },
    { status: 410 } // 410 Gone
  );
}
