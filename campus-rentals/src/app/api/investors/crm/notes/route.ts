import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dealId, content, isPrivate } = body;

    if (!dealId || !content) {
      return NextResponse.json(
        { error: 'Deal ID and content are required' },
        { status: 400 }
      );
    }

    const note = await prisma.dealNote.create({
      data: {
        dealId,
        content,
        isPrivate: isPrivate || false,
        createdById: user.id,
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

    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note', details: error.message },
      { status: 500 }
    );
  }
}

