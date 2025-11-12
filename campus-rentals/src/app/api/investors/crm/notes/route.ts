import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/investors/crm/notes - Create a note
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { dealId, content, isPrivate } = body

    const note = await prisma.dealNote.create({
      data: {
        dealId,
        content,
        isPrivate: isPrivate || false,
        createdBy: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Create activity log
    await prisma.dealActivity.create({
      data: {
        dealId,
        activityType: 'NOTE_ADDED',
        title: 'Note added',
        description: `A note was added to the deal`,
        performedBy: user.id,
        metadata: {
          noteId: note.id,
          isPrivate: note.isPrivate,
        },
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note', details: error.message },
      { status: 500 }
    )
  }
}

