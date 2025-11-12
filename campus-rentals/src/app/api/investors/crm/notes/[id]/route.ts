import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// PUT /api/investors/crm/notes/[id] - Update note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { content, isPrivate } = body

    // Check if user owns the note (for private notes)
    const note = await prisma.dealNote.findUnique({
      where: { id: params.id },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.isPrivate && note.createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden - Cannot edit private note' }, { status: 403 })
    }

    const updatedNote = await prisma.dealNote.update({
      where: { id: params.id },
      data: {
        content,
        isPrivate: isPrivate !== undefined ? isPrivate : note.isPrivate,
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

    return NextResponse.json({ note: updatedNote })
  } catch (error: any) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: 'Failed to update note', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/investors/crm/notes/[id] - Delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const note = await prisma.dealNote.findUnique({
      where: { id: params.id },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.isPrivate && note.createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden - Cannot delete private note' }, { status: 403 })
    }

    await prisma.dealNote.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note', details: error.message },
      { status: 500 }
    )
  }
}

