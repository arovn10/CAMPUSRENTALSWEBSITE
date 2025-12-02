import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { investorS3Service } from '@/lib/investorS3Service';

// GET - Get all files and folders for a property/deal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check if user has access to this property
    const userInvestment = await prisma.investment.findFirst({
      where: {
        propertyId: params.id,
        userId: user.id,
      },
    });

    // Check for entity investments - check both global and per-deal owners
    const userEntityInvestment = await prisma.entityInvestment.findFirst({
      where: {
        propertyId: params.id,
        OR: [
          {
            entity: {
              entityOwners: {
                some: { userId: user.id },
              },
            },
          },
          {
            entityInvestmentOwners: {
              some: { userId: user.id },
            },
          },
        ],
      },
    });

    // Check if user is a follower
    const userFollower = await prisma.dealFollower.findFirst({
      where: {
        propertyId: params.id,
        OR: [
          { userId: user.id },
          { contact: { email: user.email } },
        ],
      },
    });

    // Check access
    const hasAccess =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      !!userInvestment ||
      !!userEntityInvestment ||
      !!userFollower;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all folders and files
    const folders = await prisma.dealFolder.findMany({
      where: { propertyId: params.id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            files: true,
            subFolders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const files = await prisma.dealFile.findMany({
      where: { propertyId: params.id },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ folders, files });
  } catch (error) {
    console.error('Error fetching deal files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Upload a new file
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can upload files
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderIdRaw = formData.get('folderId');
    const folderId = folderIdRaw && typeof folderIdRaw === 'string' && folderIdRaw.trim() !== '' ? folderIdRaw.trim() : null;
    const descriptionRaw = formData.get('description');
    const description = descriptionRaw && typeof descriptionRaw === 'string' && descriptionRaw.trim() !== '' ? descriptionRaw.trim() : null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided or invalid file' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await prisma.dealFolder.findFirst({
        where: {
          id: folderId,
          propertyId: params.id,
        },
      });

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    // Convert file to buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (error) {
      console.error('Error converting file to buffer:', error);
      return NextResponse.json(
        { error: 'Failed to process file', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Upload to S3
    let uploadResult;
    try {
      uploadResult = await investorS3Service.uploadFile({
        fileName: file.name,
        buffer,
        contentType: file.type || 'application/octet-stream',
        propertyId: params.id,
      });
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Save file record
    let dealFile;
    try {
      dealFile = await prisma.dealFile.create({
        data: {
          propertyId: params.id,
          folderId: folderId || null,
          fileName: uploadResult.key.split('/').pop() || file.name,
          originalName: file.name,
          filePath: uploadResult.url,
          fileSize: buffer.length,
          mimeType: file.type || 'application/octet-stream',
          description: description || null,
          uploadedBy: user.id,
        },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error saving file record to database:', error);
      // Try to clean up S3 file if database save fails
      try {
        const key = uploadResult.key || uploadResult.url;
        await investorS3Service.deletePhoto(key);
      } catch (cleanupError) {
        console.error('Error cleaning up S3 file after database failure:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to save file record', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ file: dealFile }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

