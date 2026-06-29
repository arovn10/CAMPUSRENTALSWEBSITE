import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveDocumentFile, isAllowedMimeType, getMaxFileSize } from '@/lib/documentStorage'
import { sendK1ReadyEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/investors/k1/deliver   (ADMIN/MANAGER) — multipart/form-data
 * Fields: file (PDF), userId, year
 *
 * Uploads a finalized K-1 PDF and e-delivers it to ONE investor: creates a
 * TAX_DOCUMENT Document scoped to the user (entityType USER), routes it with an
 * explicit DocumentAccess grant (so canAccessDocument shows it to that investor
 * only — never other LPs), records an in-app notification, and emails them.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const userId = String(form.get('userId') || '')
    const year = Number(form.get('year')) || new Date().getFullYear() - 1

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A K-1 PDF file is required' }, { status: 400 })
    }
    if (file.size > getMaxFileSize()) {
      return NextResponse.json({ error: `File must be under ${getMaxFileSize() / 1024 / 1024}MB` }, { status: 400 })
    }
    const mimeType = file.type || 'application/pdf'
    if (!isAllowedMimeType(mimeType)) {
      return NextResponse.json({ error: 'File type not allowed (use PDF)' }, { status: 400 })
    }

    const investor = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, email: true },
    })
    if (!investor) return NextResponse.json({ error: 'Investor not found' }, { status: 404 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const saved = await saveDocumentFile(buffer, file.name || `K1-${year}.pdf`, mimeType)

    const doc = await prisma.document.create({
      data: {
        title: `${year} Schedule K-1`,
        description: `K-1 tax document for ${year}`,
        fileName: saved.fileName,
        filePath: saved.relativePath,
        fileSize: saved.fileSize,
        mimeType,
        documentType: 'TAX_DOCUMENT',
        entityType: 'USER',
        entityId: userId,
        isPublic: true,
        visibleToInvestor: true,
        uploadedBy: auth.id,
      },
    })

    // Route to this investor only (the grant is the routing decision).
    await prisma.documentAccess.upsert({
      where: { documentId_userId: { documentId: doc.id, userId } },
      update: {},
      create: { documentId: doc.id, userId, grantedBy: auth.id },
    })

    await prisma.notification.create({
      data: {
        userId,
        title: `${year} K-1 available`,
        message: `Your ${year} Schedule K-1 has been posted to your portal.`,
        type: 'DOCUMENT_UPLOAD',
      },
    })

    const emailed = await sendK1ReadyEmail(investor.email, { investorName: investor.firstName ?? undefined, year })

    return NextResponse.json({ success: true, documentId: doc.id, emailed: emailed.ok })
  } catch (error) {
    console.error('[k1/deliver] failed:', error)
    return NextResponse.json(
      { error: 'Failed to deliver K-1', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
}
