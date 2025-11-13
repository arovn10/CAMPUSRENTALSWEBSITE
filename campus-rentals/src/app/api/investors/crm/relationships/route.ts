import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST /api/investors/crm/relationships - Create a new relationship
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
    const { dealId, contactId, userId, role, notes } = body;

    if (!dealId || !role) {
      return NextResponse.json(
        { error: 'Deal ID and role are required' },
        { status: 400 }
      );
    }

    if (!contactId && !userId) {
      return NextResponse.json(
        { error: 'Either contact ID or user ID is required' },
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const existing = await prisma.dealRelationship.findFirst({
      where: {
        dealId,
        ...(contactId ? { contactId } : { userId }),
        role,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Relationship already exists' },
        { status: 409 }
      );
    }

    const relationship = await prisma.dealRelationship.create({
      data: {
        dealId,
        contactId: contactId || null,
        userId: userId || null,
        role,
        notes,
      },
      include: {
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(relationship, { status: 201 });
  } catch (error: any) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship', details: error.message },
      { status: 500 }
    );
  }
}

