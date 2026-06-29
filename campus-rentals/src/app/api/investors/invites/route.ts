import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, generateSecureToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendInviteEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function requireAdmin(role: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

/** GET /api/investors/invites — list invites (ADMIN/MANAGER). */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!requireAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invites = await prisma.investorInvite.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      propertyId: true, status: true, expiresAt: true, acceptedAt: true, createdAt: true,
    },
  })
  return NextResponse.json({ invites }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * POST /api/investors/invites — create + email an investor invite (ADMIN/MANAGER).
 * Body: { email, firstName?, lastName?, role?, propertyId? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!requireAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    // Only allow INVESTOR/MANAGER to be invited; never ADMIN via this path.
    const role = body?.role === 'MANAGER' ? 'MANAGER' : 'INVESTOR'
    const firstName = body?.firstName ? String(body.firstName) : null
    const lastName = body?.lastName ? String(body.lastName) : null
    const propertyId = body?.propertyId ? String(body.propertyId) : null

    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invite = await prisma.investorInvite.create({
      data: { email, firstName, lastName, role, propertyId, invitedBy: auth.id, token, expiresAt },
    })

    const emailed = await sendInviteEmail(email, {
      token,
      firstName: firstName ?? undefined,
      inviterName: `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() || undefined,
    })

    return NextResponse.json({
      success: true,
      invite: { id: invite.id, email: invite.email, status: invite.status, expiresAt: invite.expiresAt },
      emailed: emailed.ok,
    })
  } catch (error) {
    console.error('[invites] failed:', error)
    return NextResponse.json(
      { error: 'Failed to create invite', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
