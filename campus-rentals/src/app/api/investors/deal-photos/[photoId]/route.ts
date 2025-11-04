import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { investorS3Service } from '@/lib/investorS3Service'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/investors/deal-photos/[photoId]
 * Update photo metadata (description, order, thumbnail)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only admins and managers can update photos
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { description, displayOrder, isThumbnail } = body

    // Get the photo
    const photo = await prisma.dealPhoto.findUnique({
      where: { id: params.photoId },
      include: { property: true }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // If setting as thumbnail, unset other thumbnails for this property
    if (isThumbnail === true) {
      await prisma.dealPhoto.updateMany({
        where: {
          propertyId: photo.propertyId,
          isThumbnail: true,
          id: { not: params.photoId }
        },
        data: { isThumbnail: false }
      })
    }

    // Update photo
    const updatedPhoto = await prisma.dealPhoto.update({
      where: { id: params.photoId },
      data: {
        ...(description !== undefined && { description }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isThumbnail !== undefined && { isThumbnail })
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

    return NextResponse.json({
      success: true,
      photo: {
        id: updatedPhoto.id,
        photoUrl: updatedPhoto.photoUrl,
        s3Key: updatedPhoto.s3Key,
        fileName: updatedPhoto.fileName,
        description: updatedPhoto.description,
        displayOrder: updatedPhoto.displayOrder,
        isThumbnail: updatedPhoto.isThumbnail,
        fileSize: updatedPhoto.fileSize,
        mimeType: updatedPhoto.mimeType,
        uploadedBy: updatedPhoto.uploadedBy,
        uploader: updatedPhoto.uploader,
        createdAt: updatedPhoto.createdAt.toISOString(),
        updatedAt: updatedPhoto.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating deal photo:', error)
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
 * DELETE /api/investors/deal-photos/[photoId]
 * Delete a photo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only admins and managers can delete photos
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    // Get the photo
    const photo = await prisma.dealPhoto.findUnique({
      where: { id: params.photoId }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete from S3
    try {
      await investorS3Service.deletePhoto(photo.s3Key)
    } catch (s3Error) {
      console.error('Error deleting photo from S3:', s3Error)
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await prisma.dealPhoto.delete({
      where: { id: params.photoId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Photo deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting deal photo:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

