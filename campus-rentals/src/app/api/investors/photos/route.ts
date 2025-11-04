import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { investorS3Service } from '@/lib/investorS3Service'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/investors/photos
 * Upload a deal photo for investor dashboard
 * 
 * Body (FormData):
 * - file: File (required)
 * - investmentId: string (optional)
 * - dealId: string (optional)
 * - description: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('Photo upload attempt by:', user.email, 'Role:', user.role)

    // Only authenticated investors, admins, and managers can upload photos
    // Investors can upload photos for their own investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const investmentId = formData.get('investmentId') as string | null
    const dealId = formData.get('dealId') as string | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type - only images
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ]

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB for photos)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // If investmentId is provided, verify the user has access to this investment
    if (investmentId) {
      if (user.role === 'INVESTOR') {
        const investment = await prisma.investment.findFirst({
          where: {
            id: investmentId,
            userId: user.id
          }
        })

        if (!investment) {
          return NextResponse.json(
            { error: 'Investment not found or access denied' },
            { status: 403 }
          )
        }
      }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const result = await investorS3Service.uploadPhoto({
      fileName: file.name,
      buffer,
      contentType: file.type,
      investmentId: investmentId || undefined,
      dealId: dealId || undefined,
    })

    // Optionally save photo metadata to database (if you have a PropertyPhoto or similar table)
    // For now, we'll just return the URL and let the frontend handle storage
    
    console.log('Photo uploaded successfully:', result.url)

    return NextResponse.json({
      success: true,
      photo: {
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        size: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading investor photo:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/investors/photos
 * Delete a deal photo
 * 
 * Body (JSON):
 * - key: string (S3 key or full URL)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only admins and managers can delete photos
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { key, url } = body

    if (!key && !url) {
      return NextResponse.json({ error: 'Key or URL is required' }, { status: 400 })
    }

    // Extract key from URL if URL is provided
    const s3Key = key || (url ? investorS3Service.extractKeyFromUrl(url) : null)

    if (!s3Key) {
      return NextResponse.json({ error: 'Invalid key or URL' }, { status: 400 })
    }

    // Verify the key is in the investor-deals prefix
    if (!s3Key.startsWith('investor-deals/')) {
      return NextResponse.json({ error: 'Invalid photo key' }, { status: 400 })
    }

    await investorS3Service.deletePhoto(s3Key)

    return NextResponse.json({ success: true, message: 'Photo deleted successfully' })

  } catch (error) {
    console.error('Error deleting investor photo:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/investors/photos
 * List photos for an investment or deal
 * 
 * Query params:
 * - investmentId: string (optional)
 * - dealId: string (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const investmentId = searchParams.get('investmentId')
    const dealId = searchParams.get('dealId')

    // If investmentId is provided, verify access
    if (investmentId && user.role === 'INVESTOR') {
      const investment = await prisma.investment.findFirst({
        where: {
          id: investmentId,
          userId: user.id
        }
      })

      if (!investment) {
        return NextResponse.json(
          { error: 'Investment not found or access denied' },
          { status: 403 }
        )
      }
    }

    // For now, return empty array - in a full implementation, you might
    // want to store photo metadata in the database and query it here
    // This is a placeholder - you can extend it to query PropertyPhoto table
    // or implement a list operation in the S3 service

    return NextResponse.json({
      photos: []
    })

  } catch (error) {
    console.error('Error fetching investor photos:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

