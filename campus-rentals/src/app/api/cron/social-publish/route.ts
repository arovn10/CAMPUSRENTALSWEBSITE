import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret, errorResponse } from '@/lib/social/guard'
import { runPublishCycle } from '@/lib/social/publish'
import { refreshIfDue } from '@/lib/social/credentials'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/cron/social-publish
 *
 * Sends at most one human-approved post to Instagram, subject to the rolling
 * cap and the minimum gap. Refreshes the long-lived token first when it is due,
 * because a publish on an expired token fails in a way that reads like a
 * content error.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request)
  if (unauthorized) return unauthorized

  try {
    const token = await refreshIfDue()
    const result = await runPublishCycle()
    console.log(
      `[social-publish] attempted=${result.attempted} published=${result.published}` +
        (result.blocked ? ` blocked=${result.blocked}` : '') +
        (token.refreshed ? ' token=refreshed' : '')
    )
    return NextResponse.json({ ...result, tokenDaysToExpiry: token.daysToExpiry })
  } catch (error) {
    console.error('[social-publish] failed:', error)
    return errorResponse('Publish cycle failed', error)
  }
}
