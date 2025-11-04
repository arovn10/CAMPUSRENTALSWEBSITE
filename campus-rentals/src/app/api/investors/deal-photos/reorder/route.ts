import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/investors/deal-photos/reorder
 * Update the display order of multiple photos at once
 * 
 * Body (JSON):
 * - photoIds: string[] (array of photo IDs in desired order)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only admins and managers can reorder photos
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { photoIds } = body

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: 'photoIds array is required' }, { status: 400 })
    }

    // Update display order for each photo
    const updatePromises = photoIds.map((photoId: string, index: number) =>
      prisma.dealPhoto.update({
        where: { id: photoId },
        data: { displayOrder: index }
      })
    )

    await Promise.all(updatePromises)

    return NextResponse.json({ 
      success: true, 
      message: 'Photo order updated successfully' 
    })

  } catch (error) {
    console.error('Error reordering photos:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

