import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { investorS3Service } from '@/lib/investorS3Service'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/investors/deal-photos?investmentId=xxx
 * Get all photos for a specific investment/deal
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const investmentId = searchParams.get('investmentId')

    if (!investmentId) {
      return NextResponse.json({ error: 'investmentId is required' }, { status: 400 })
    }

    // Verify user has access to this investment (direct or entity investment)
    if (user.role === 'INVESTOR') {
      // Check direct investment first
      const directInvestment = await prisma.investment.findFirst({
        where: {
          id: investmentId,
          userId: user.id
        }
      })

      // If not a direct investment, check entity investment access
      if (!directInvestment) {
        const entityInvestment = await prisma.entityInvestment.findFirst({
          where: { id: investmentId },
          include: {
            entityInvestmentOwners: true,
            entity: {
              include: {
                entityOwners: true
              }
            }
          }
        })

        if (!entityInvestment) {
          return NextResponse.json(
            { error: 'Investment not found or access denied' },
            { status: 403 }
          )
        }

        // Check if user has access through entityInvestmentOwners or entity.entityOwners
        const hasDirectAccess = 
          entityInvestment.entityInvestmentOwners.some((owner: any) => owner.userId === user.id) ||
          entityInvestment.entity?.entityOwners.some((owner: any) => owner.userId === user.id)

        // Check nested access through breakdown
        const hasNestedAccess = entityInvestment.entityInvestmentOwners.some((owner: any) => {
          if (owner.breakdown && Array.isArray(owner.breakdown)) {
            return owner.breakdown.some((item: any) => {
              const itemId = item.id || null
              const itemLabel = (item.label || '').trim().toLowerCase()
              const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase()
              return (
                (itemId && String(itemId) === String(user.id)) ||
                (itemLabel === userName)
              )
            })
          }
          return false
        })

        if (!hasDirectAccess && !hasNestedAccess) {
          return NextResponse.json(
            { error: 'Investment not found or access denied' },
            { status: 403 }
          )
        }
      }
    }

    // Check if this is an entity investment or direct investment
    const entityInvestment = await prisma.entityInvestment.findUnique({
      where: { id: investmentId },
      include: { property: true }
    })

    let photos: any[] = []

    if (entityInvestment) {
      // This is an entity investment - get photos from all direct investments for the same property
      const directInvestments = await prisma.investment.findMany({
        where: { propertyId: entityInvestment.propertyId },
        select: { id: true }
      })

      const directInvestmentIds = directInvestments.map(inv => inv.id)

      if (directInvestmentIds.length > 0) {
        photos = await prisma.dealPhoto.findMany({
          where: { investmentId: { in: directInvestmentIds } },
          orderBy: [
            { displayOrder: 'asc' },
            { createdAt: 'asc' }
          ],
          include: {
            uploader: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })
      }
    } else {
      // This is a direct investment - get photos normally
      photos = await prisma.dealPhoto.findMany({
        where: { investmentId },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          uploader: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
    }

    return NextResponse.json({
      photos: photos.map(photo => ({
        id: photo.id,
        photoUrl: photo.photoUrl,
        s3Key: photo.s3Key,
        fileName: photo.fileName,
        description: photo.description,
        displayOrder: photo.displayOrder,
        isThumbnail: photo.isThumbnail,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        uploadedBy: photo.uploadedBy,
        uploader: photo.uploader,
        createdAt: photo.createdAt.toISOString(),
        updatedAt: photo.updatedAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Error fetching deal photos:', error)
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
 * POST /api/investors/deal-photos
 * Upload a new photo for an investment/deal
 * 
 * Body (FormData):
 * - file: File (required)
 * - investmentId: string (required)
 * - description: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('Deal photo upload attempt by:', user.email, 'Role:', user.role)

    // Only authenticated users can upload photos
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const investmentId = formData.get('investmentId') as string | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!investmentId) {
      return NextResponse.json({ error: 'investmentId is required' }, { status: 400 })
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

    // Verify user has access to this investment
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
    } else {
      // For admins/managers, verify investment exists
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId }
      })

      if (!investment) {
        return NextResponse.json(
          { error: 'Investment not found' },
          { status: 404 }
        )
      }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3 - organized by investment ID
    const result = await investorS3Service.uploadPhoto({
      fileName: file.name,
      buffer,
      contentType: file.type,
      investmentId: investmentId,
    })

    // Get the next display order for this investment
    const maxOrder = await prisma.dealPhoto.aggregate({
      where: { investmentId },
      _max: { displayOrder: true }
    })
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1

    // Check if this should be the thumbnail (first photo or if no thumbnail exists)
    const existingThumbnail = await prisma.dealPhoto.findFirst({
      where: {
        investmentId,
        isThumbnail: true
      }
    })
    const isThumbnail = !existingThumbnail

    // Save photo metadata to database
    const dealPhoto = await prisma.dealPhoto.create({
      data: {
        investmentId,
        photoUrl: result.url,
        s3Key: result.key,
        fileName: result.fileName,
        description: description || null,
        displayOrder: nextOrder,
        isThumbnail,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user.id
      },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    console.log('Deal photo uploaded successfully:', dealPhoto.id)

    return NextResponse.json({
      success: true,
      photo: {
        id: dealPhoto.id,
        photoUrl: dealPhoto.photoUrl,
        s3Key: dealPhoto.s3Key,
        fileName: dealPhoto.fileName,
        description: dealPhoto.description,
        displayOrder: dealPhoto.displayOrder,
        isThumbnail: dealPhoto.isThumbnail,
        fileSize: dealPhoto.fileSize,
        mimeType: dealPhoto.mimeType,
        uploadedBy: dealPhoto.uploadedBy,
        uploader: dealPhoto.uploader,
        createdAt: dealPhoto.createdAt.toISOString(),
        updatedAt: dealPhoto.updatedAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading deal photo:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

