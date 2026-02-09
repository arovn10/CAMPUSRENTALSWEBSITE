import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { pipelineDealFileExists, createPipelineDealFileReadStream } from '@/lib/pipelineDealFileStorage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const row = await queryOne<{ originalName: string; mimeType: string; filePath: string }>(
      'SELECT "originalName", "mimeType", "filePath" FROM pipeline_deal_files WHERE id = $1 AND "dealId" = $2',
      [params.fileId, params.id]
    )
    if (!row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (!pipelineDealFileExists(row.filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }

    const stream = createPipelineDealFileReadStream(row.filePath)
    const headers = new Headers()
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.originalName || 'download')}"`
    )
    headers.set('Content-Type', row.mimeType || 'application/octet-stream')

    return new NextResponse(stream as any, { headers })
  } catch (e: any) {
    console.error('Error downloading pipeline deal file:', e)
    return NextResponse.json(
      { error: 'Failed to download file', details: e?.message },
      { status: 500 }
    )
  }
}
