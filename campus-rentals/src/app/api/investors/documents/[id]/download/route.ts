import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { existsSync } from 'fs'
import { join } from 'path'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  documentFileExists,
  createDocumentReadStream,
} from '@/lib/documentStorage'

/**
 * GET /api/investors/documents/[id]/download
 * Stream the file after checking auth and visibility. Supports both:
 * - New path format: relative (documents/xxx) stored in uploads/
 * - Legacy path format: /documents/xxx in public/documents
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
    const doc = await prisma.document.findUnique({
      where: { id },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!doc.isPublic || !doc.visibleToInvestor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Admins and managers can always see
    const isStaff = user.role === 'ADMIN' || user.role === 'MANAGER'
    if (!isStaff) {
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

    const filePath = doc.filePath
    if (!filePath) {
      return NextResponse.json({ error: 'File not available' }, { status: 404 })
    }

    const mimeType = doc.mimeType || 'application/octet-stream'
    const fileName = doc.fileName || doc.title

    // New format: relative path (documents/xxx) under uploads/
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const existsInUploads = documentFileExists(relativePath)

    let stream: NodeJS.ReadableStream
    if (existsInUploads) {
      stream = createDocumentReadStream(relativePath)
    } else {
      // Legacy: file in public/documents
      const publicPath = join(process.cwd(), 'public', filePath)
      if (!existsSync(publicPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      stream = createReadStream(publicPath)
    }

    const headers = new Headers()
    headers.set('Content-Type', mimeType)
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    if (doc.fileSize) headers.set('Content-Length', String(doc.fileSize))

    return new NextResponse(stream as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error serving document download:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
