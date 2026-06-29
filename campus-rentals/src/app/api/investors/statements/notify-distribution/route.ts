import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDistributionNoticeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/investors/statements/notify-distribution   (ADMIN / MANAGER only)
 *
 * Records an in-app notification AND sends a branded distribution-notice email
 * to an investor for a distribution that was recorded outside the portal.
 *
 * Body: { userId, propertyName, amount, date?, note? }
 *
 * This is record-only (the portal is the book of record; money moves outside it).
 * Email failure is non-fatal — the in-app notification still lands.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const userId = String(body?.userId || '')
    const propertyName = String(body?.propertyName || '').trim()
    const amount = Number(body?.amount)
    const date = body?.date ? new Date(body.date) : new Date()
    const note = body?.note ? String(body.note) : undefined

    if (!userId || !propertyName || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'userId, propertyName and a positive amount are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

    await prisma.notification.create({
      data: {
        userId,
        title: 'Distribution recorded',
        message: `A distribution of ${usd} has been recorded for ${propertyName}.`,
        type: 'DISTRIBUTION',
      },
    })

    const emailed = await sendDistributionNoticeEmail(user.email, {
      investorName: `${user.firstName ?? ''}`.trim() || undefined,
      propertyName,
      amount,
      date,
      note,
    })

    return NextResponse.json({ success: true, notified: true, emailed: emailed.ok })
  } catch (error) {
    console.error('[notify-distribution] failed:', error)
    return NextResponse.json(
      { error: 'Failed to send distribution notice', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
