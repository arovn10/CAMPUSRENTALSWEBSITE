import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret, errorResponse } from '@/lib/social/guard'
import { generateDrafts } from '@/lib/social/candidates'
import { generationEnabled } from '@/lib/social/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/cron/social-generate
 *
 * Refills the review queue from the content sources. Publishes nothing — the
 * output of this job is drafts awaiting a human.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request)
  if (unauthorized) return unauthorized

  if (!generationEnabled()) {
    return NextResponse.json({ skipped: 'SOCIAL_GENERATION_ENABLED is false' })
  }

  try {
    const result = await generateDrafts()
    console.log(
      `[social-generate] considered=${result.considered} queued=${result.queued} ` +
        `duplicate=${result.skippedDuplicate} compliance=${result.skippedCompliance.length} capped=${result.capped}`
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('[social-generate] failed:', error)
    return errorResponse('Draft generation failed', error)
  }
}
