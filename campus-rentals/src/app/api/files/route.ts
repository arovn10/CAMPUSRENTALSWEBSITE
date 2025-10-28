import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fileService } from '@/lib/fileService'
import { FileCategory } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as FileCategory
    const isPublic = formData.get('isPublic') === 'true'
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'File category is required' }, { status: 400 })
    }

    // Validate file type
    const isValidType = await fileService.validateFileType(file.type, category)
    if (!isValidType) {
      return NextResponse.json(
        { error: `Invalid file type for category ${category}` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload file
    const result = await fileService.uploadFile(buffer, {
      userId: user.id,
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category,
      isPublic,
      metadata
    })

    // Get file details
    const fileDetails = await prisma.fileUpload.findUnique({
      where: { id: result.fileId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      file: fileDetails,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'File upload failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as FileCategory
    const publicOnly = searchParams.get('public') === 'true'

    let files

    if (publicOnly) {
      files = await fileService.getPublicFiles(category)
    } else {
      files = await fileService.getUserFiles(user.id, category)
    }

    return NextResponse.json({
      success: true,
      files
    })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    await fileService.deleteFile(fileId, user.id)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    )
  }
}
