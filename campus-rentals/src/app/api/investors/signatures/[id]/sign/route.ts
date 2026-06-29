import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/investors/signatures/[id]/sign
 * Body: { signatureText, action?: 'SIGN' | 'DECLINE' }
 *
 * Lightweight in-house e-sign: the investor types their full legal name as the
 * signature. We record the typed signature, timestamp, and IP as an immutable
 * intent-to-sign record. Ownership-scoped: a caller can only act on their own
 * signature request. (For docs that legally require a notarized/qualified
 * signature, route to an external vendor instead — this covers acknowledgements.)
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const sigReq = await prisma.signatureRequest.findUnique({ where: { id: params.id } })
    if (!sigReq) return NextResponse.json({ error: 'Signature request not found' }, { status: 404 })
    if (sigReq.userId !== auth.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (sigReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been completed' }, { status: 409 })
    }

    const body = await request.json()
    const action = String(body?.action || 'SIGN').toUpperCase()

    if (action === 'DECLINE') {
      await prisma.signatureRequest.update({ where: { id: sigReq.id }, data: { status: 'DECLINED' } })
      return NextResponse.json({ success: true, status: 'DECLINED' })
    }

    const signatureText = String(body?.signatureText || '').trim()
    if (signatureText.length < 2) {
      return NextResponse.json({ error: 'Type your full legal name to sign' }, { status: 400 })
    }

    await prisma.signatureRequest.update({
      where: { id: sigReq.id },
      data: {
        status: 'SIGNED',
        signerName: signatureText,
        signatureText,
        signedAt: new Date(),
        ipAddress: getClientIp(request),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.id,
        action: 'UPDATE',
        resource: 'DOCUMENT',
        resourceId: sigReq.documentId,
        details: { type: 'E_SIGNATURE', signatureRequestId: sigReq.id },
      },
    })

    return NextResponse.json({ success: true, status: 'SIGNED' })
  } catch (error) {
    console.error('[signatures/sign] failed:', error)
    return NextResponse.json(
      { error: 'Failed to record signature', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
