import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE - Remove a follower from a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; followerId: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can remove followers
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.dealFollower.delete({
      where: { id: params.followerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing follower:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update follower access level
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; followerId: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can update followers
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { accessLevel, notes } = body;

    const follower = await prisma.dealFollower.update({
      where: { id: params.followerId },
      data: {
        accessLevel: accessLevel || 'VIEW_ONLY',
        notes: notes || null,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            title: true,
          },
        },
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

    return NextResponse.json({ follower });
  } catch (error) {
    console.error('Error updating follower:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

