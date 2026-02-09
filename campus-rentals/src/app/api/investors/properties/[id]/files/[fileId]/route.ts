import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { investorS3Service } from '@/lib/investorS3Service';
import { isLocalPath } from '@/lib/dealFileStorage';

async function checkDealFileAccess(fileId: string, propertyId: string, user: { id: string; role: string; email: string }) {
  const file = await prisma.dealFile.findUnique({
    where: { id: fileId },
    include: {
      property: {
        include: {
          investments: { where: { userId: user.id } },
          entityInvestments: {
            include: { entityOwners: { where: { userId: user.id } } },
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
  if (!file || file.propertyId !== propertyId) return null;
  const hasAccess =
    user.role === 'ADMIN' ||
    user.role === 'MANAGER' ||
    file.property.investments.length > 0 ||
    file.property.entityInvestments.some((ei: any) => ei.entityOwners.length > 0) ||
    file.property.followers.length > 0;
  return hasAccess ? file : null;
}

// GET - Returns signed URL (S3) or download URL (local)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, fileId } = await params;
    const file = await checkDealFileAccess(fileId, id, user);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (isLocalPath(file.filePath)) {
      const base = request.nextUrl.origin;
      const downloadUrl = `${base}/api/investors/properties/${id}/files/${fileId}/download`;
      return NextResponse.json({ url: downloadUrl, fileName: file.originalName, local: true });
    }

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
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { fileId } = await params;
    const file = await prisma.dealFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (isLocalPath(file.filePath)) {
      const { deleteDealFile } = await import('@/lib/dealFileStorage');
      await deleteDealFile(file.filePath);
    } else {
      try {
        const key = investorS3Service.extractKeyFromUrl(file.filePath) || file.filePath;
        await investorS3Service.deletePhoto(key);
      } catch (s3Error) {
        console.error('Error deleting from S3:', s3Error);
      }
    }

    await prisma.dealFile.delete({ where: { id: fileId } });
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
  { params }: { params: Promise<{ id: string; fileId: string }> }
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

    const { fileId } = await params;
    const file = await prisma.dealFile.update({
      where: { id: fileId },
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

