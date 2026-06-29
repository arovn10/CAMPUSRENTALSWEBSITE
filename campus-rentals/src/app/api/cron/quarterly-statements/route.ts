import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildCapitalAccount } from '@/lib/ims/capitalAccount'
import { renderStatementPdf } from '@/lib/ims/statement'
import { sendStatementEmail } from '@/lib/email'
import { lastCompletedQuarter } from '@/lib/ims/periods'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/cron/quarterly-statements
 *
 * Generates and emails a PDF capital-account statement for every investor with
 * at least one position, for the most recently completed quarter. Intended to be
 * called by a scheduled GitHub Action (.github/workflows/quarterly-statements.yml)
 * on the 1st of Jan/Apr/Jul/Oct.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).
 * Processed sequentially with per-investor error isolation so one failure can't
 * abort the run; returns a summary. Pass { dryRun: true } to build without emailing.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const provided = auth?.startsWith('Bearer ') ? auth.substring(7) : headerSecret
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let dryRun = false
  try {
    const body = await request.json().catch(() => ({}))
    dryRun = body?.dryRun === true
  } catch {
    /* no body */
  }

  const period = lastCompletedQuarter()

  try {
    // Investors who actually hold a position (direct investment or entity ownership).
    const [directUserIds, ownerUserIds] = await Promise.all([
      prisma.investment.findMany({ select: { userId: true }, distinct: ['userId'] }),
      prisma.entityOwner.findMany({ where: { userId: { not: null } }, select: { userId: true }, distinct: ['userId'] }),
    ])
    const userIds = Array.from(
      new Set([
        ...directUserIds.map((r) => r.userId).filter(Boolean),
        ...ownerUserIds.map((r) => r.userId).filter((v): v is string => !!v),
      ])
    )

    const results: Array<{ userId: string; email?: string; ok: boolean; reason?: string }> = []
    for (const userId of userIds) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, email: true, isActive: true },
        })
        if (!user || !user.isActive) {
          results.push({ userId, ok: false, reason: 'inactive or missing' })
          continue
        }
        const data = await buildCapitalAccount(userId)
        if (data.accounts.length === 0) {
          results.push({ userId, email: user.email, ok: false, reason: 'no positions' })
          continue
        }
        const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        const pdf = await renderStatementPdf(
          { investorName: name, investorEmail: user.email, periodLabel: period.label },
          data
        )
        if (dryRun) {
          results.push({ userId, email: user.email, ok: true, reason: 'dryRun (not sent)' })
          continue
        }
        const sent = await sendStatementEmail(user.email, { investorName: user.firstName ?? undefined, periodLabel: period.label, pdf })
        results.push({ userId, email: user.email, ok: sent.ok, reason: sent.ok ? undefined : 'email failed' })
      } catch (e) {
        results.push({ userId, ok: false, reason: e instanceof Error ? e.message : 'error' })
      }
    }

    const sent = results.filter((r) => r.ok).length
    console.log(`[quarterly-statements] ${period.label}: ${sent}/${results.length} sent (dryRun=${dryRun})`)
    return NextResponse.json({ period: period.label, total: results.length, sent, dryRun, results })
  } catch (error) {
    console.error('[quarterly-statements] failed:', error)
    return NextResponse.json(
      { error: 'Quarterly statement run failed', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
