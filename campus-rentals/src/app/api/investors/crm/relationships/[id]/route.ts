import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// PUT /api/investors/crm/relationships/[id] - Update relationship
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { role, notes } = body

    const relationship = await prisma.dealRelationship.update({
      where: { id: params.id },
      data: {
        role,
        notes,
      },
      include: {
        contact: true,
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ relationship })
  } catch (error: any) {
    console.error('Error updating relationship:', error)
    return NextResponse.json(
      { error: 'Failed to update relationship', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/investors/crm/relationships/[id] - Delete relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    await prisma.dealRelationship.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting relationship:', error)
    return NextResponse.json(
      { error: 'Failed to delete relationship', details: error.message },
      { status: 500 }
    )
  }
}

