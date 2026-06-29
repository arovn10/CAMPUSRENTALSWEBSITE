import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const isAdmin = (role: string) => role === 'ADMIN' || role === 'MANAGER'

/**
 * GET /api/investors/signatures
 * Investor: their own signature requests. Admin/manager: all (with investor info).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const requests = await prisma.signatureRequest.findMany({
    where: isAdmin(auth.role) ? {} : { userId: auth.id },
    orderBy: { createdAt: 'desc' },
    include: {
      document: { select: { id: true, title: true, fileName: true } },
      user: isAdmin(auth.role) ? { select: { firstName: true, lastName: true, email: true } } : false,
    },
  })

  const rows = requests.map((r) => ({
    id: r.id,
    documentId: r.documentId,
    documentTitle: r.document?.title ?? r.document?.fileName ?? 'Document',
    status: r.status,
    signerName: r.signerName,
    signedAt: r.signedAt,
    createdAt: r.createdAt,
    ...(isAdmin(auth.role) && 'user' in r && r.user
      ? { investor: `${(r as any).user.firstName ?? ''} ${(r as any).user.lastName ?? ''}`.trim() || (r as any).user.email }
      : {}),
  }))
  return NextResponse.json({ requests: rows }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * POST /api/investors/signatures  (ADMIN/MANAGER)
 * Create a signature request. Body: { documentId, userId }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdmin(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const documentId = String(body?.documentId || '')
    const userId = String(body?.userId || '')
    if (!documentId || !userId) {
      return NextResponse.json({ error: 'documentId and userId are required' }, { status: 400 })
    }
    const [doc, investor] = await Promise.all([
      prisma.document.findUnique({ where: { id: documentId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ])
    if (!doc || !investor) {
      return NextResponse.json({ error: 'Document or investor not found' }, { status: 404 })
    }

    const sigReq = await prisma.signatureRequest.create({
      data: { documentId, userId, createdBy: auth.id },
    })
    // Ensure the signer can see the document (auto-route via an access grant).
    await prisma.documentAccess.upsert({
      where: { documentId_userId: { documentId, userId } },
      update: {},
      create: { documentId, userId, grantedBy: auth.id },
    })
    await prisma.notification.create({
      data: {
        userId,
        title: 'Document awaiting your signature',
        message: 'A document in your portal requires your signature.',
        type: 'DOCUMENT_UPLOAD',
      },
    })

    return NextResponse.json({ success: true, id: sigReq.id })
  } catch (error) {
    console.error('[signatures] failed:', error)
    return NextResponse.json(
      { error: 'Failed to create signature request', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
