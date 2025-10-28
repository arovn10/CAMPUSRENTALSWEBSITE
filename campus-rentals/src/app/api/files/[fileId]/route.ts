import { NextRequest, NextResponse } from 'next/server'
import { fileService } from '@/lib/fileService'
import fs from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('token')

    let fileData

    if (shareToken) {
      // Access via share token
      fileData = await fileService.getFileByShareToken(shareToken)
    } else {
      // Regular access - need authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
      }

      const token = authHeader.substring(7)
      const { verifyToken } = await import('@/lib/auth')
      const user = verifyToken(token)
      
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      fileData = await fileService.getFile(fileId, user.id)
    }

    if (!fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read file from disk
    const fileBuffer = await fs.promises.readFile(fileData.filePath)

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', fileData.mimeType)
    headers.set('Content-Disposition', `attachment; filename="${fileData.fileName}"`)
    headers.set('Content-Length', fileBuffer.length.toString())

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'File download failed' },
      { status: 500 }
    )
  }
}
