import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  saveDocumentFile,
  isAllowedMimeType,
  getMaxFileSize,
} from '@/lib/documentStorage'

// Real database documents only - no mock data

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')
    const isAdminList = (user.role === 'ADMIN' || user.role === 'MANAGER') && scope === 'all'

    let documents: Awaited<ReturnType<typeof prisma.document.findMany>>
    if (isAdminList) {
      documents = await prisma.document.findMany({
        orderBy: { createdAt: 'desc' }
      })
    } else {
      const investments = await prisma.investment.findMany({
        where: { userId: user.id },
        select: { propertyId: true }
      })
      const propertyIds = [...new Set(investments.map((i) => i.propertyId).filter(Boolean))]
      documents = await prisma.document.findMany({
        where: {
          isPublic: true,
          visibleToInvestor: true,
          OR: [
            { uploadedBy: user.id },
            ...(propertyIds.length > 0
              ? [{ entityType: 'PROPERTY' as const, entityId: { in: propertyIds } }]
              : [])
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Transform to match expected format (include filePath for download)
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      documentType: doc.documentType,
      entityType: doc.entityType,
      entityId: doc.entityId,
      entityName: doc.description || 'Unknown Entity',
      uploadedAt: doc.createdAt.toISOString(),
      fileSize: doc.fileSize || 0,
      filePath: doc.filePath,
      fileName: doc.fileName,
      mimeType: doc.mimeType
    }))

    return NextResponse.json(formattedDocuments)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    console.log('Document upload attempt by:', user.email, 'Role:', user.role)
    
    // Only admins and managers may upload documents
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      console.log('Unauthorized upload attempt by:', user.email, 'Role:', user.role)
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    let title: string | undefined,
      description: string | undefined,
      documentType: string | undefined,
      entityType: string | undefined,
      entityId: string | undefined,
      fileSize: number = 0,
      fileName: string | undefined,
      mimeType: string = 'application/pdf',
      visibleToAdmin: boolean = true,
      visibleToManager: boolean = true,
      visibleToInvestor: boolean = true
    let filePathForDb: string | undefined

    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      title = formData.get('title') as string
      description = formData.get('description') as string
      documentType = formData.get('documentType') as string
      entityType = formData.get('entityType') as string
      entityId = formData.get('entityId') as string
      visibleToAdmin = formData.get('visibleToAdmin') === 'true'
      visibleToManager = formData.get('visibleToManager') === 'true'
      visibleToInvestor = formData.get('visibleToInvestor') === 'true'
      const file = formData.get('file') as File | null

      if (!file || !(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'A file is required for upload' }, { status: 400 })
      }
      if (file.size > getMaxFileSize()) {
        return NextResponse.json({
          error: `File size must be under ${getMaxFileSize() / 1024 / 1024}MB`,
        }, { status: 400 })
      }
      mimeType = file.type || 'application/octet-stream'
      if (!isAllowedMimeType(mimeType)) {
        return NextResponse.json({
          error: 'File type not allowed. Allowed: PDF, Word, Excel, images, CSV, text.',
        }, { status: 400 })
      }

      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const saved = await saveDocumentFile(buffer, file.name, mimeType)
        fileName = saved.fileName
        fileSize = saved.fileSize
        filePathForDb = saved.relativePath
      } catch (fileError) {
        const msg = fileError instanceof Error ? fileError.message : 'Unknown error'
        console.error('Error saving file:', fileError)
        if (msg.includes('size') || msg.includes('MB')) {
          return NextResponse.json({ error: msg }, { status: 400 })
        }
        if (msg.includes('type not allowed')) {
          return NextResponse.json({ error: 'This file type isn\'t supported. Use PDF, Word, Excel, images (JPG, PNG, HEIC), or CSV.' }, { status: 400 })
        }
        return NextResponse.json({ error: 'File could not be saved. Try a different file or name.' }, { status: 500 })
      }
    } else {
      // Handle JSON data
      const body = await request.json()
      title = body.title
      description = body.description || body.entityName
      documentType = body.documentType
      entityType = body.entityType
      entityId = body.entityId
      visibleToAdmin = body.visibleToAdmin !== undefined ? body.visibleToAdmin : true
      visibleToManager = body.visibleToManager !== undefined ? body.visibleToManager : true
      visibleToInvestor = body.visibleToInvestor !== undefined ? body.visibleToInvestor : true
      fileSize = body.fileSize || 0
      fileName = body.fileName || (title ? `${title}.pdf` : 'document.pdf')
      mimeType = body.mimeType || 'application/pdf'
      filePathForDb = body.filePath || (fileName ? `documents/${fileName}` : undefined)
    }

    if (!title || !entityType || !entityId) {
      return NextResponse.json({
        error: 'Please provide a title, and choose where to save (Company or a property).',
      }, { status: 400 })
    }

    // entityId "company" = company-wide (no property); only admins/managers see in list
    const validDocumentTypes = ['RECEIPT', 'EXPENSE', 'TAX_DOCUMENT', 'PPM', 'OFFERING_MEMORANDUM', 'OPERATING_AGREEMENT', 'FINANCIAL_STATEMENT', 'CONTRACT', 'APPRAISAL', 'INSURANCE', 'TITLE_REPORT', 'ENVIRONMENTAL_REPORT', 'OTHER']
    const safeDocumentType = documentType && validDocumentTypes.includes(documentType) ? documentType : 'OTHER'

    // Map entityType to valid enum values
    let validEntityType = entityType
    if (entityType === 'INVESTMENT') {
      validEntityType = 'PROPERTY' // Investments are tied to properties
    }
    
    console.log('Creating document with entityType:', validEntityType, 'original:', entityType)
    
    const newDocument = await prisma.document.create({
      data: {
        title,
        description: description || 'Document',
        fileName: fileName || `${title}.pdf`,
        filePath: filePathForDb || `documents/${fileName || 'doc'}`,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/pdf',
        documentType: safeDocumentType,
        entityType: validEntityType as any,
        entityId: entityId,
        isPublic: true,
        visibleToAdmin: visibleToAdmin !== undefined ? visibleToAdmin : true,
        visibleToManager: visibleToManager !== undefined ? visibleToManager : true,
        visibleToInvestor: visibleToInvestor !== undefined ? visibleToInvestor : true,
        uploadedBy: user.id
      }
    })

    console.log('Document created successfully:', newDocument.id)
    return NextResponse.json(newDocument, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 