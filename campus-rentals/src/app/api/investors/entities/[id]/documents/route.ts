import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const entityId = params.id

    // Verify entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Get all documents for this entity
    const documents = await prisma.document.findMany({
      where: {
        entityId: entityId,
        entityType: 'USER', // Entities use USER type in Document model
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching entity documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const entityId = params.id

    // Verify entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Handle file upload
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const documentType = formData.get('documentType') as string
    const file = formData.get('file') as File

    if (!title || !file) {
      return NextResponse.json(
        { error: 'Title and file are required' },
        { status: 400 }
      )
    }

    // Save file to server
    const { writeFile, mkdir } = await import('fs/promises')
    const { join } = await import('path')

    const documentsDir = join(process.cwd(), 'public', 'documents', 'entities')
    await mkdir(documentsDir, { recursive: true })

    const timestamp = Date.now()
    const uniqueFileName = `${timestamp}-${file.name}`
    const filePath = join(documentsDir, uniqueFileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create document record
    const document = await prisma.document.create({
      data: {
        title,
        description: description || title,
        fileName: uniqueFileName,
        filePath: `/documents/entities/${uniqueFileName}`,
        fileSize: buffer.length,
        mimeType: file.type || 'application/pdf',
        documentType: (documentType as any) || 'OTHER',
        entityType: 'USER', // Entities use USER type
        entityId: entityId,
        isPublic: true,
        visibleToAdmin: true,
        visibleToManager: true,
        visibleToInvestor: false, // Entity documents typically not visible to investors
        uploadedBy: user.id,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading entity document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

