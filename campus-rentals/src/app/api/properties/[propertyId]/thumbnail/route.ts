import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/properties/[propertyId]/thumbnail
 * Get thumbnail photo for a property by numeric propertyId or string id
 * Public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const propertyId = params.propertyId

    // Check if propertyId is numeric (old backend ID) or string (new ID)
    const isNumeric = /^\d+$/.test(propertyId)

    let property: { id: string } | null = null

    if (isNumeric) {
      // Find property by numeric propertyId
      property = await prisma.property.findUnique({
        where: { propertyId: parseInt(propertyId) },
        select: { id: true }
      })
    } else {
      // Use as string ID directly
      property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true }
      })
    }

    if (!property) {
      return NextResponse.json({ thumbnail: null })
    }

    // Get thumbnail photo for this property
    const thumbnail = await prisma.dealPhoto.findFirst({
      where: {
        propertyId: property.id,
        isThumbnail: true
      },
      orderBy: {
        displayOrder: 'asc'
      },
      select: {
        photoUrl: true
      }
    })

    // If no thumbnail marked, get first photo by display order
    if (!thumbnail) {
      const firstPhoto = await prisma.dealPhoto.findFirst({
        where: {
          propertyId: property.id
        },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' }
        ],
        select: {
          photoUrl: true
        }
      })

      return NextResponse.json({
        thumbnail: firstPhoto?.photoUrl || null
      })
    }

    return NextResponse.json({
      thumbnail: thumbnail.photoUrl
    })

  } catch (error) {
    console.error('Error fetching property thumbnail:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

