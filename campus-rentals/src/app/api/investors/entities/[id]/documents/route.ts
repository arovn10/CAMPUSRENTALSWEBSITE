import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { investorS3Service } from '@/lib/investorS3Service'
import { query, queryOne } from '@/lib/db'

// Increase max duration for file uploads
export const maxDuration = 60

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

    // Verify entity exists using SQL
    const entity = await queryOne<{ id: string }>(
      'SELECT id FROM entities WHERE id = $1',
      [entityId]
    )

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Get all documents for this entity using SQL
    const documents = await query(`
      SELECT 
        d.*,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as user
      FROM documents d
      LEFT JOIN users u ON d."uploadedBy" = u.id
      WHERE d."entityId" = $1 AND d."entityType" = 'USER'
      ORDER BY d."createdAt" DESC
    `, [entityId])

    return NextResponse.json(documents || [])
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

    // Verify entity exists using SQL
    const entity = await queryOne<{ id: string }>(
      'SELECT id FROM entities WHERE id = $1',
      [entityId]
    )

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

    // Upload file to S3
    let documentUrl: string | null = null
    let documentFileName: string | null = null
    let documentS3Key: string | null = null

    try {
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds maximum limit of 50MB' },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      console.log(`Uploading document for entity ${entityId}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
      
      const uploadResult = await investorS3Service.uploadFile({
        fileName: file.name,
        buffer,
        contentType: file.type || 'application/pdf',
        propertyId: `entity-${entityId}`, // Use entity ID as property identifier for S3 organization
      })
      
      documentUrl = uploadResult.url
      documentFileName = uploadResult.fileName
      documentS3Key = uploadResult.key
      
      console.log(`Successfully uploaded document to S3: ${documentUrl}`)
    } catch (uploadError) {
      console.error('Error uploading entity document to S3:', uploadError)
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error'
      const errorStack = uploadError instanceof Error ? uploadError.stack : undefined
      console.error('Upload error details:', { errorMessage, errorStack })
      return NextResponse.json(
        { error: 'Failed to upload document to storage', details: errorMessage },
        { status: 500 }
      )
    }

    // Verify user exists in database and get their ID using SQL
    const dbUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [user.id]
    )

    if (!dbUser) {
      // Try to find user by email as fallback
      const dbUserByEmail = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      )
      
      if (!dbUserByEmail) {
        console.error(`User not found in database: ${user.id} / ${user.email}`)
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 500 }
        )
      }
      
      // Use the email-found user ID
      user.id = dbUserByEmail.id
    }

    // Create document record using SQL
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const document = await queryOne(`
      INSERT INTO documents (
        id, title, description, "fileName", "filePath", "fileSize", "mimeType",
        "documentType", "entityType", "entityId", "isPublic",
        "visibleToAdmin", "visibleToManager", "visibleToInvestor", "uploadedBy",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING *
    `, [
      documentId,
      title,
      description || title,
      documentFileName,
      documentUrl,
      file.size,
      file.type || 'application/pdf',
      documentType || 'OTHER',
      'USER',
      entityId,
      true,
      true,
      true,
      false,
      user.id
    ])

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading entity document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

