import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; folderId: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const folder = await prisma.dealFolder.update({
      where: { id: params.folderId },
      data: {
        name: name || undefined,
        description: description || null,
      },
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; folderId: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if folder has files or subfolders
    const folder = await prisma.dealFolder.findUnique({
      where: { id: params.folderId },
      include: {
        _count: {
          select: {
            files: true,
            subFolders: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (folder._count.files > 0 || folder._count.subFolders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with files or subfolders. Please empty it first.' },
        { status: 400 }
      );
    }

    await prisma.dealFolder.delete({
      where: { id: params.folderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

