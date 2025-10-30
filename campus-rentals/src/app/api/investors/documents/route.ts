import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Real database documents only - no mock data

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.log('Documents requested by:', user.email)

    // Get real documents from database
    const documents = await prisma.document.findMany({
      where: { 
        uploadedBy: user.id,
        isPublic: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform to match expected format
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      documentType: doc.documentType,
      entityType: doc.entityType,
      entityName: doc.description || 'Unknown Entity',
      uploadedAt: doc.createdAt.toISOString(),
      fileSize: doc.fileSize || 0
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

    // Handle both JSON and FormData
    let title, description, documentType, entityType, entityId, fileSize, fileName, mimeType, visibleToAdmin, visibleToManager, visibleToInvestor
    
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      title = formData.get('title') as string
      description = formData.get('description') as string
      documentType = formData.get('documentType') as string
      entityType = formData.get('entityType') as string
      entityId = formData.get('entityId') as string
      visibleToAdmin = formData.get('visibleToAdmin') === 'true'
      visibleToManager = formData.get('visibleToManager') === 'true'
      visibleToInvestor = formData.get('visibleToInvestor') === 'true'
      const file = formData.get('file') as File
      
      if (file) {
        fileName = file.name
        fileSize = file.size
        mimeType = file.type
        
        // Save the file to the server
        try {
          // Create documents directory if it doesn't exist
          const documentsDir = join(process.cwd(), 'public', 'documents')
          await mkdir(documentsDir, { recursive: true })
          
          // Generate unique filename
          const timestamp = Date.now()
          const uniqueFileName = `${timestamp}-${fileName}`
          const filePath = join(documentsDir, uniqueFileName)
          
          // Convert File to Buffer and save
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          await writeFile(filePath, buffer)
          
          console.log('File saved successfully:', filePath)
          
          // Update filePath for database
          fileName = uniqueFileName
          fileSize = buffer.length
        } catch (fileError) {
          console.error('Error saving file:', fileError)
          return NextResponse.json({ 
            error: 'Failed to save file to server',
            details: fileError instanceof Error ? fileError.message : 'Unknown file error'
          }, { status: 500 })
        }
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
      fileName = body.fileName || `${title}.pdf`
      mimeType = body.mimeType || 'application/pdf'
    }

    // Validate required fields
    if (!title || !entityType || !entityId) {
      console.log('Missing required fields:', { title, entityType, entityId })
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: { title: !!title, entityType: !!entityType, entityId: !!entityId }
      }, { status: 400 })
    }

    // Map entityType to valid enum values
    let validEntityType = entityType
    if (entityType === 'INVESTMENT') {
      validEntityType = 'PROPERTY' // Investments are tied to properties
    }
    
    console.log('Creating document with entityType:', validEntityType, 'original:', entityType)
    
    // Create new document in database
    const newDocument = await prisma.document.create({
      data: {
        title,
        description: description || 'Document',
        fileName: fileName || `${title}.pdf`,
        filePath: `/documents/${fileName}`,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/pdf',
        documentType: documentType || 'OTHER',
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