import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { savePipelineDealFile } from '@/lib/pipelineDealFileStorage'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

// GET – list files for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const deal = await queryOne<{ id: string }>('SELECT id FROM deals WHERE id = $1', [params.id])
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const rows = await query<{
      id: string
      fileName: string
      originalName: string
      filePath: string
      fileSize: number
      mimeType: string
      description: string | null
      uploadedById: string
      createdAt: Date
      firstName: string
      lastName: string
    }>(`
      SELECT 
        f.id, f."fileName", f."originalName", f."filePath", f."fileSize", f."mimeType", f.description,
        f."uploadedById", f."createdAt",
        u."firstName", u."lastName"
      FROM pipeline_deal_files f
      JOIN users u ON f."uploadedById" = u.id
      WHERE f."dealId" = $1
      ORDER BY f."createdAt" DESC
    `, [params.id])

    const files = (rows || []).map((r) => ({
      id: r.id,
      fileName: r.fileName,
      originalName: r.originalName,
      filePath: r.filePath,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      description: r.description,
      uploadedBy: { id: r.uploadedById, firstName: r.firstName, lastName: r.lastName },
      createdAt: r.createdAt,
    }))

    return NextResponse.json(files)
  } catch (e: any) {
    if (e?.message?.includes('pipeline_deal_files') || e?.code === '42P01') {
      return NextResponse.json(
        { error: 'Deal files not available. Run migration 008_pipeline_deal_files.' },
        { status: 503 }
      )
    }
    console.error('Error listing pipeline deal files:', e)
    return NextResponse.json(
      { error: 'Failed to list files', details: e?.message },
      { status: 500 }
    )
  }
}

// POST – upload a file to the deal
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
      return NextResponse.json({ error: 'Only admin or manager can upload deal files' }, { status: 403 })
    }

    const deal = await queryOne<{ id: string }>('SELECT id FROM deals WHERE id = $1', [params.id])
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const description = (formData.get('description') as string) || null

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be under ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }
    const mimeType = file.type || 'application/octet-stream'
    if (ALLOWED_TYPES.length && !ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed: PDF, images, Word, Excel, text, CSV.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { relativePath, fileName } = await savePipelineDealFile(
      buffer,
      file.name,
      params.id
    )

    const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    await query(
      `INSERT INTO pipeline_deal_files (
        id, "dealId", "fileName", "originalName", "filePath", "fileSize", "mimeType", description, "uploadedById", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        id,
        params.id,
        fileName,
        file.name,
        relativePath,
        file.size,
        mimeType,
        description,
        user.id,
      ]
    )

    const inserted = await queryOne(`
      SELECT id, "fileName", "originalName", "filePath", "fileSize", "mimeType", description, "uploadedById", "createdAt"
      FROM pipeline_deal_files WHERE id = $1
    `, [id])

    return NextResponse.json(inserted, { status: 201 })
  } catch (e: any) {
    if (e?.message?.includes('pipeline_deal_files') || e?.code === '42P01') {
      return NextResponse.json(
        { error: 'Deal files not available. Run migration 008_pipeline_deal_files.' },
        { status: 503 }
      )
    }
    console.error('Error uploading pipeline deal file:', e)
    return NextResponse.json(
      { error: 'Failed to upload file', details: e?.message },
      { status: 500 }
    )
  }
}
