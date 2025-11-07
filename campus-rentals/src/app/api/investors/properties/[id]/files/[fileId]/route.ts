import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { investorS3Service } from '@/lib/investorS3Service';

// GET - Download file (returns signed URL)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access to property
    const file = await prisma.dealFile.findUnique({
      where: { id: params.fileId },
      include: {
        property: {
          include: {
            investments: {
              where: { userId: user.id },
            },
            entityInvestments: {
              include: {
                entityOwners: {
                  where: { userId: user.id },
                },
              },
            },
            followers: {
              where: {
                OR: [
                  { userId: user.id },
                  { contact: { email: user.email } },
                ],
              },
            },
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check access
    const hasAccess =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      file.property.investments.length > 0 ||
      file.property.entityInvestments.some(ei => ei.entityOwners.length > 0) ||
      file.property.followers.length > 0;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate signed URL for S3 file (handles both URLs and keys)
    const signedUrl = await investorS3Service.getSignedUrlFromPath(file.filePath);

    return NextResponse.json({ url: signedUrl, fileName: file.originalName });
  } catch (error) {
    console.error('Error getting file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can delete files
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const file = await prisma.dealFile.findUnique({
      where: { id: params.fileId },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from S3
    try {
      const key = investorS3Service.extractKeyFromUrl(file.filePath) || file.filePath;
      await investorS3Service.deletePhoto(key);
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await prisma.dealFile.delete({
      where: { id: params.fileId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update file metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
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
    const { description, folderId } = body;

    const file = await prisma.dealFile.update({
      where: { id: params.fileId },
      data: {
        description: description !== undefined ? description : undefined,
        folderId: folderId !== undefined ? folderId : undefined,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

