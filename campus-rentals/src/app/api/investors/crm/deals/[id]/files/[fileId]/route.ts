import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import {
  pipelineDealFileExists,
  createPipelineDealFileReadStream,
  deletePipelineDealFile,
} from '@/lib/pipelineDealFileStorage'

// DELETE – remove a file from the deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Only admin or manager can delete deal files' }, { status: 403 })
    }

    const row = await queryOne<{ id: string; filePath: string; dealId: string }>(
      'SELECT id, "filePath", "dealId" FROM pipeline_deal_files WHERE id = $1 AND "dealId" = $2',
      [params.fileId, params.id]
    )
    if (!row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (pipelineDealFileExists(row.filePath)) {
      await deletePipelineDealFile(row.filePath)
    }
    await queryOne('DELETE FROM pipeline_deal_files WHERE id = $1', [params.fileId])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error deleting pipeline deal file:', e)
    return NextResponse.json(
      { error: 'Failed to delete file', details: e?.message },
      { status: 500 }
    )
  }
}
