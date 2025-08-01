import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const documentType = searchParams.get('documentType');

    let documents;

    if (user.role === 'ADMIN' || user.role === 'SPONSOR') {
      // Admin and sponsors can see all documents
      const whereClause: any = {};
      
      if (entityType) whereClause.entityType = entityType;
      if (entityId) whereClause.entityId = entityId;
      if (documentType) whereClause.documentType = documentType;

      documents = await prisma.document.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Investors can only see documents related to their investments
      const userInvestments = await prisma.investment.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { propertyId: true },
      });

      const userFundInvestments = await prisma.fundInvestment.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { fundId: true },
      });

      const propertyIds = userInvestments.map(inv => inv.propertyId);
      const fundIds = userFundInvestments.map(inv => inv.fundId);

      const whereClause: any = {
        OR: [
          { isPublic: true },
          { entityType: 'PROPERTY', entityId: { in: propertyIds } },
          { entityType: 'FUND', entityId: { in: fundIds } },
          { entityType: 'USER', entityId: user.id },
        ],
      };

      if (entityType) whereClause.entityType = entityType;
      if (entityId) whereClause.entityId = entityId;
      if (documentType) whereClause.documentType = documentType;

      documents = await prisma.document.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Group documents by entity type and add entity details
    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        let entityDetails = null;

        if (doc.entityType === 'PROPERTY') {
          const property = await prisma.property.findUnique({
            where: { id: doc.entityId },
            select: { name: true, address: true },
          });
          entityDetails = property;
        } else if (doc.entityType === 'FUND') {
          const fund = await prisma.fund.findUnique({
            where: { id: doc.entityId },
            select: { name: true, description: true },
          });
          entityDetails = fund;
        }

        return {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          fileName: doc.fileName,
          filePath: doc.filePath,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          documentType: doc.documentType,
          entityType: doc.entityType,
          entityId: doc.entityId,
          entityDetails,
          uploadedBy: doc.user,
          isPublic: doc.isPublic,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      })
    );

    return NextResponse.json(documentsWithDetails);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Check if user has permission to upload documents
    if (user.role !== 'ADMIN' && user.role !== 'SPONSOR') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      fileName,
      filePath,
      fileSize,
      mimeType,
      documentType,
      entityType,
      entityId,
      isPublic = false,
    } = body;

    // Validate required fields
    if (!title || !fileName || !filePath || !documentType || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        description,
        fileName,
        filePath,
        fileSize,
        mimeType,
        documentType,
        entityType,
        entityId,
        uploadedBy: user.id,
        isPublic,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 