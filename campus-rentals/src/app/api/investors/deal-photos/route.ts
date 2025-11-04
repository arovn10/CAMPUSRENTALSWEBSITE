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
    const propertyId = searchParams.get('propertyId')

    let targetPropertyId: string | null = null

    // If propertyId is provided directly, use it
    if (propertyId) {
      targetPropertyId = propertyId
    } else if (investmentId) {
      // Otherwise, get propertyId from the investment
      // Check direct investment first
      const directInvestment = await prisma.investment.findUnique({
        where: { id: investmentId },
        select: { propertyId: true }
      })

      if (directInvestment) {
        targetPropertyId = directInvestment.propertyId
      } else {
        // Check entity investment
        const entityInvestment = await prisma.entityInvestment.findUnique({
          where: { id: investmentId },
          select: { propertyId: true }
        })

        if (entityInvestment) {
          targetPropertyId = entityInvestment.propertyId
        }
      }
    }

    if (!targetPropertyId) {
      return NextResponse.json({ error: 'propertyId or investmentId is required' }, { status: 400 })
    }

    // Verify user has access to this property through investments
    if (user.role === 'INVESTOR') {
      // Check if user has access via direct investment
      const hasDirectAccess = await prisma.investment.findFirst({
        where: {
          propertyId: targetPropertyId,
          userId: user.id
        }
      })

      // Check if user has access via entity investment
      let hasEntityAccess = false
      if (!hasDirectAccess) {
        const entityInvestments = await prisma.entityInvestment.findMany({
          where: { propertyId: targetPropertyId },
          include: {
            entityInvestmentOwners: true,
            entity: {
              include: {
                entityOwners: true
              }
            }
          }
        })

        hasEntityAccess = entityInvestments.some((ei: any) => {
          const hasDirectOwnerAccess = 
            ei.entityInvestmentOwners.some((owner: any) => owner.userId === user.id) ||
            ei.entity?.entityOwners.some((owner: any) => owner.userId === user.id)

          if (hasDirectOwnerAccess) return true

          // Check nested access through breakdown
          return ei.entityInvestmentOwners.some((owner: any) => {
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
        })
      }

      if (!hasDirectAccess && !hasEntityAccess) {
        return NextResponse.json(
          { error: 'Property not found or access denied' },
          { status: 403 }
        )
      }
    }

    // Get all photos for this property
    const photos = await prisma.dealPhoto.findMany({
      where: { propertyId: targetPropertyId },
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

    // Only admins and managers can upload photos - investors are view-only
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions. Investors have view-only access.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const investmentId = formData.get('investmentId') as string | null
    const propertyId = formData.get('propertyId') as string | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    let targetPropertyId: string | null = propertyId

    // If propertyId not provided, get it from investmentId
    if (!targetPropertyId && investmentId) {
      const directInvestment = await prisma.investment.findUnique({
        where: { id: investmentId },
        select: { propertyId: true }
      })

      if (directInvestment) {
        targetPropertyId = directInvestment.propertyId
      } else {
        const entityInvestment = await prisma.entityInvestment.findUnique({
          where: { id: investmentId },
          select: { propertyId: true }
        })

        if (entityInvestment) {
          targetPropertyId = entityInvestment.propertyId
        }
      }
    }

    if (!targetPropertyId) {
      return NextResponse.json({ error: 'propertyId or investmentId is required' }, { status: 400 })
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

    // Verify user has access to this property
    if (user.role === 'INVESTOR') {
      const hasDirectAccess = await prisma.investment.findFirst({
        where: {
          propertyId: targetPropertyId,
          userId: user.id
        }
      })

      if (!hasDirectAccess) {
        const entityInvestments = await prisma.entityInvestment.findMany({
          where: { propertyId: targetPropertyId },
          include: {
            entityInvestmentOwners: true,
            entity: {
              include: {
                entityOwners: true
              }
            }
          }
        })

        const hasEntityAccess = entityInvestments.some((ei: any) => {
          return (
            ei.entityInvestmentOwners.some((owner: any) => owner.userId === user.id) ||
            ei.entity?.entityOwners.some((owner: any) => owner.userId === user.id) ||
            ei.entityInvestmentOwners.some((owner: any) => {
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
          )
        })

        if (!hasEntityAccess) {
          return NextResponse.json(
            { error: 'Property not found or access denied' },
            { status: 403 }
          )
        }
      }
    } else {
      // For admins/managers, verify property exists
      const property = await prisma.property.findUnique({
        where: { id: targetPropertyId }
      })

      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3 - organized by property ID
    const result = await investorS3Service.uploadPhoto({
      fileName: file.name,
      buffer,
      contentType: file.type,
      investmentId: targetPropertyId, // Use propertyId for folder organization
    })

    // Get the next display order for this property
    const maxOrder = await prisma.dealPhoto.aggregate({
      where: { propertyId: targetPropertyId },
      _max: { displayOrder: true }
    })
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1

    // Check if this should be the thumbnail (first photo or if no thumbnail exists)
    const existingThumbnail = await prisma.dealPhoto.findFirst({
      where: {
        propertyId: targetPropertyId,
        isThumbnail: true
      }
    })
    const isThumbnail = !existingThumbnail

    // Save photo metadata to database
    const dealPhoto = await prisma.dealPhoto.create({
      data: {
        propertyId: targetPropertyId,
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

