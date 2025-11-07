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
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const uploadResult = await investorS3Service.uploadFile({
      fileName: file.name,
      buffer,
      contentType: file.type,
      propertyId: params.id,
    });

    // Save file record
    const dealFile = await prisma.dealFile.create({
      data: {
        propertyId: params.id,
        folderId: folderId || null,
        fileName: uploadResult.key.split('/').pop() || file.name,
        originalName: file.name,
        filePath: uploadResult.url,
        fileSize: buffer.length,
        mimeType: file.type,
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

    return NextResponse.json({ file: dealFile }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

