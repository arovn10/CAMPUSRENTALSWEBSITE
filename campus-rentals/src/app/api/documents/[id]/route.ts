import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { requireAuth } from '@/lib/auth'
import { canAccessDocument } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import {
  documentFileExists,
  getAbsolutePath,
  readDocumentFile,
} from '@/lib/documentStorage'

async function loadAuthorizedDocument(request: NextRequest, id: string) {
  const user = await requireAuth(request)
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const document = await prisma.document.findUnique({ where: { id } })
  if (!document) {
    return { error: NextResponse.json({ error: 'Document not found' }, { status: 404 }) }
  }

  if (!(await canAccessDocument(user, document))) {
    return { error: NextResponse.json({ error: 'Access denied to this document' }, { status: 403 }) }
  }

  return { user, document }
}

async function readDocumentBytes(filePath: string): Promise<Buffer | null> {
  if (!filePath) return null
  const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
  if (documentFileExists(relativePath)) {
    return readDocumentFile(relativePath)
  }
  const publicPath = join(process.cwd(), 'public', filePath)
  if (existsSync(publicPath)) {
    return readFile(publicPath)
  }
  // Absolute uploads path if a legacy row stored one
  try {
    return await readFile(getAbsolutePath(relativePath))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const loaded = await loadAuthorizedDocument(request, params.id)
    if ('error' in loaded && loaded.error) return loaded.error
    const { document } = loaded as { document: NonNullable<Awaited<ReturnType<typeof prisma.document.findUnique>>> }

    const fileBuffer = await readDocumentBytes(document.filePath)
    if (!fileBuffer) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 })
    }

    return new NextResponse(fileBuffer as BodyInit, {
      headers: {
        'Content-Type': document.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        // Private docs must not be shared via shared caches.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error serving document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const existingDocument = await prisma.document.findUnique({ where: { id: params.id } })
    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        documentType: body.documentType as any,
        visibleToAdmin: body.visibleToAdmin !== undefined ? body.visibleToAdmin : true,
        visibleToManager: body.visibleToManager !== undefined ? body.visibleToManager : true,
        visibleToInvestor: body.visibleToInvestor !== undefined ? body.visibleToInvestor : true,
        isPublic: body.isPublic !== undefined ? !!body.isPublic : existingDocument.isPublic,
      },
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const document = await prisma.document.findUnique({ where: { id: params.id } })
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    try {
      const relativePath = document.filePath?.startsWith('/')
        ? document.filePath.slice(1)
        : document.filePath
      if (relativePath && documentFileExists(relativePath)) {
        const { deleteDocumentFile } = await import('@/lib/documentStorage')
        await deleteDocumentFile(relativePath)
      } else {
        const filePath = join(process.cwd(), 'public', document.filePath)
        await unlink(filePath)
      }
    } catch (fileError) {
      console.error('Error deleting file from server:', fileError)
    }

    await prisma.document.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
