import { NextRequest, NextResponse } from 'next/server'
import { requireSocialReviewer, errorResponse } from '@/lib/social/guard'
import { pipelineStats } from '@/lib/social/insights'
import {
  publishingEnabled,
  instagramConfigured,
  maxMediaPerWindow,
  windowHours,
  minPublishGapMinutes,
} from '@/lib/social/config'
import { cadenceAllowance } from '@/lib/social/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET /api/social/stats — queue counts, follower series and cadence state. */
export async function GET(request: NextRequest) {
  const gate = await requireSocialReviewer(request)
  if ('response' in gate) return gate.response

  try {
    const [stats, cadence] = await Promise.all([pipelineStats(), cadenceAllowance()])
    return NextResponse.json({
      ...stats,
      publishingEnabled: publishingEnabled(),
      instagramConfigured: instagramConfigured(),
      maxMediaPerWindow: maxMediaPerWindow(),
      windowHours: windowHours(),
      minPublishGapMinutes: minPublishGapMinutes(),
      cadence,
    })
  } catch (error) {
    console.error('[social] stats failed:', error)
    return errorResponse('Could not load stats', error)
  }
}
