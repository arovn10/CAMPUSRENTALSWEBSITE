import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteDocumentFile } from '@/lib/documentStorage'
import { join } from 'path'
import { unlink } from 'fs/promises'

/**
 * GET /api/investors/documents/[id]
 * Return one document (metadata). Access same as list.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'MANAGER'
    if (!isStaff) {
      if (!doc.isPublic || !doc.visibleToInvestor) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      const investments = await prisma.investment.findMany({
        where: { userId: user.id },
        select: { propertyId: true },
      })
      const propertyIds = [...new Set(investments.map((i) => i.propertyId).filter(Boolean))]
      const canAccess =
        doc.uploadedBy === user.id ||
        (doc.entityType === 'PROPERTY' && propertyIds.includes(doc.entityId))
      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      entityType: doc.entityType,
      entityId: doc.entityId,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      visibleToAdmin: doc.visibleToAdmin,
      visibleToManager: doc.visibleToManager,
      visibleToInvestor: doc.visibleToInvestor,
      uploadedAt: doc.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/investors/documents/[id]
 * Update title, description, visibility. Admin/Manager only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.visibleToAdmin !== undefined) data.visibleToAdmin = body.visibleToAdmin
    if (body.visibleToManager !== undefined) data.visibleToManager = body.visibleToManager
    if (body.visibleToInvestor !== undefined) data.visibleToInvestor = body.visibleToInvestor

    const updated = await prisma.document.update({
      where: { id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/investors/documents/[id]
 * Delete document and file from disk. Admin/Manager only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const relativePath = doc.filePath.startsWith('/') ? doc.filePath.slice(1) : doc.filePath
    try {
      await deleteDocumentFile(relativePath)
    } catch (e) {
      // Legacy file in public/documents
      try {
        const publicPath = join(process.cwd(), 'public', doc.filePath)
        await unlink(publicPath)
      } catch (_) {
        // Ignore if missing
      }
    }

    await prisma.document.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
