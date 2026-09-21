import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret, errorResponse } from '@/lib/social/guard'
import { runTrackingCycle } from '@/lib/social/insights'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/cron/social-insights
 *
 * Snapshots per-media engagement and the account's follower count. Read-only
 * against Instagram; safe to run on any cadence the Graph quota allows.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request)
  if (unauthorized) return unauthorized

  try {
    const result = await runTrackingCycle()
    console.log(
      `[social-insights] media=${result.mediaTracked} followers=${result.followers ?? '?'} errors=${result.errors}`
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('[social-insights] failed:', error)
    return errorResponse('Tracking cycle failed', error)
  }
}
