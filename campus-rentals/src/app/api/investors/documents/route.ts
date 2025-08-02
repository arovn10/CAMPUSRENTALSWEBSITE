import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// Mock documents data
const DOCUMENTS = [
  {
    id: 'doc-1',
    title: 'Operating Agreement - Campus Rentals Fund I',
    documentType: 'LEGAL',
    entityType: 'FUND',
    entityName: 'Campus Rentals Fund I',
    uploadedAt: '2024-01-15T00:00:00.000Z',
    fileSize: 2048576, // 2MB
  },
  {
    id: 'doc-2',
    title: 'Q1 2024 Financial Report',
    documentType: 'FINANCIAL',
    entityType: 'FUND',
    entityName: 'Campus Rentals Fund I',
    uploadedAt: '2024-04-15T00:00:00.000Z',
    fileSize: 1048576, // 1MB
  },
  {
    id: 'doc-3',
    title: 'Property Purchase Agreement - 123 Main St',
    documentType: 'LEGAL',
    entityType: 'PROPERTY',
    entityName: '123 Main Street',
    uploadedAt: '2024-02-01T00:00:00.000Z',
    fileSize: 3145728, // 3MB
  },
  {
    id: 'doc-4',
    title: 'Tax K-1 Form 2023',
    documentType: 'TAX',
    entityType: 'FUND',
    entityName: 'Campus Rentals Fund I',
    uploadedAt: '2024-03-15T00:00:00.000Z',
    fileSize: 524288, // 512KB
  },
  {
    id: 'doc-5',
    title: 'Property Management Agreement',
    documentType: 'CONTRACT',
    entityType: 'PROPERTY',
    entityName: '456 Oak Avenue',
    uploadedAt: '2024-01-20T00:00:00.000Z',
    fileSize: 1572864, // 1.5MB
  }
]

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Documents requested by:', user.email)

    // Filter documents based on user role and entity type
    let documents = DOCUMENTS

    if (user.role === 'INVESTOR') {
      // For investors, only show fund-related documents
      documents = DOCUMENTS.filter(doc => doc.entityType === 'FUND')
    }

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Only admins and managers can upload documents
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { title, documentType, entityType, entityName, fileSize } = body

    // Validate required fields
    if (!title || !documentType || !entityType || !entityName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create new document
    const newDocument = {
      id: `doc-${Date.now()}`,
      title,
      documentType,
      entityType,
      entityName,
      uploadedAt: new Date().toISOString(),
      fileSize: fileSize || 0
    }

    // In a real app, you'd save this to the database
    DOCUMENTS.push(newDocument)

    return NextResponse.json(newDocument, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 