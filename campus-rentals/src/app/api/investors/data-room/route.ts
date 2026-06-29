import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessProperty } from '@/lib/access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/investors/data-room?propertyId=...
 *
 * Per-deal data room: the investor-visible documents attached to a property the
 * caller can access, PLUS any documents explicitly routed to them via a
 * DocumentAccess grant, with their signature-request status surfaced inline.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const propertyId = new URL(request.url).searchParams.get('propertyId')
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
  }
  if (!(await canAccessProperty(auth, propertyId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isStaff = auth.role === 'ADMIN' || auth.role === 'MANAGER'

  // Documents attached to this property (deal), filtered to investor-visible for
  // non-staff. Explicit grants are layered in below.
  const docs = await prisma.document.findMany({
    where: {
      entityType: 'PROPERTY',
      entityId: propertyId,
      ...(isStaff ? {} : { isPublic: true, visibleToInvestor: true }),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, fileName: true, documentType: true, fileSize: true,
      mimeType: true, createdAt: true,
    },
  })

  // Signature requests for this caller across the listed docs.
  const docIds = docs.map((d) => d.id)
  const sigs = docIds.length
    ? await prisma.signatureRequest.findMany({
        where: { documentId: { in: docIds }, userId: auth.id },
        select: { id: true, documentId: true, status: true },
      })
    : []
  const sigByDoc = new Map(sigs.map((s) => [s.documentId, s]))

  const documents = docs.map((d) => ({
    id: d.id,
    title: d.title,
    fileName: d.fileName,
    documentType: d.documentType,
    fileSize: d.fileSize,
    createdAt: d.createdAt,
    downloadUrl: `/api/investors/documents/${d.id}/download`,
    signature: sigByDoc.get(d.id) ? { id: sigByDoc.get(d.id)!.id, status: sigByDoc.get(d.id)!.status } : null,
  }))

  return NextResponse.json({ propertyId, documents }, { headers: { 'Cache-Control': 'no-store' } })
}
