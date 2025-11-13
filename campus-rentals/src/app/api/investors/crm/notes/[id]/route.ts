import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PUT /api/investors/crm/notes/[id] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, isPrivate } = body;

    // Check if user owns the note (for private notes)
    const existingNote = await prisma.dealNote.findUnique({
      where: { id: params.id },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Only allow editing if user is admin/manager or owns the note
    if (existingNote.isPrivate && existingNote.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to edit this note' },
        { status: 403 }
      );
    }

    const note = await prisma.dealNote.update({
      where: { id: params.id },
      data: {
        ...(content !== undefined && { content }),
        ...(isPrivate !== undefined && { isPrivate }),
      },
      include: {
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(note);
  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if user owns the note (for private notes)
    const existingNote = await prisma.dealNote.findUnique({
      where: { id: params.id },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Only allow deleting if user is admin/manager or owns the note
    if (existingNote.isPrivate && existingNote.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this note' },
        { status: 403 }
      );
    }

    await prisma.dealNote.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note', details: error.message },
      { status: 500 }
    );
  }
}

