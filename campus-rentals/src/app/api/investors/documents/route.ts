import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const documentType = searchParams.get('documentType')

    let documents

    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      // Admin and managers can see all documents
      const whereClause: any = {}
      
      if (entityType) whereClause.entityType = entityType
      if (entityId) whereClause.entityId = entityId
      if (documentType) whereClause.documentType = documentType

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
      })
    } else {
      // Investors can only see documents related to their investments
      const userInvestments = await prisma.investment.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { propertyId: true },
      })

      const userFundInvestments = await prisma.fundInvestment.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { fundId: true },
      })

      const propertyIds = userInvestments.map(inv => inv.propertyId)
      const fundIds = userFundInvestments.map(inv => inv.fundId)

      const whereClause: any = {
        OR: [
          { isPublic: true },
          { entityType: 'PROPERTY', entityId: { in: propertyIds } },
          { entityType: 'FUND', entityId: { in: fundIds } },
          { entityType: 'USER', entityId: user.id },
        ],
      }

      if (entityType) whereClause.entityType = entityType
      if (entityId) whereClause.entityId = entityId
      if (documentType) whereClause.documentType = documentType

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
      })
    }

    // Group documents by entity type and add entity details
    const documentsWithDetails = await Promise.all(
      documents.map(async (doc: any) => {
        let entityDetails = null

        if (doc.entityType === 'PROPERTY') {
          const property = await prisma.property.findUnique({
            where: { id: doc.entityId },
            select: { name: true, address: true },
          })
          entityDetails = property
        } else if (doc.entityType === 'FUND') {
          const fund = await prisma.fund.findUnique({
            where: { id: doc.entityId },
            select: { name: true, description: true },
          })
          entityDetails = fund
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
          entityName: entityDetails?.name || 'Unknown',
          entityAddress: (entityDetails as any)?.address,
          isPublic: doc.isPublic,
          uploadedBy: doc.uploadedBy,
          uploadedAt: doc.createdAt,
          user: doc.user,
        }
      })
    )

    return NextResponse.json(documentsWithDetails)
  } catch (error) {
    console.error('Error fetching investor documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to upload documents
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
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
      isPublic,
    } = body

    // Validate required fields
    if (!title || !fileName || !filePath || !documentType || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate entity exists
    if (entityType === 'PROPERTY') {
      const property = await prisma.property.findUnique({
        where: { id: entityId },
      })
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
    } else if (entityType === 'FUND') {
      const fund = await prisma.fund.findUnique({
        where: { id: entityId },
      })
      if (!fund) {
        return NextResponse.json(
          { error: 'Fund not found' },
          { status: 404 }
        )
      }
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        description,
        fileName,
        filePath,
        fileSize: parseInt(fileSize),
        mimeType,
        documentType,
        entityType,
        entityId,
        isPublic: isPublic || false,
        uploadedBy: user.id,
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
    })

    // Create notification for relevant users
    if (entityType === 'PROPERTY') {
      const propertyInvestors = await prisma.investment.findMany({
        where: { propertyId: entityId, status: 'ACTIVE' },
        select: { userId: true },
      })

      for (const investor of propertyInvestors) {
        await prisma.notification.create({
          data: {
            userId: investor.userId,
            title: 'New Document Uploaded',
            message: `A new document "${title}" has been uploaded for a property you're invested in`,
            type: 'DOCUMENT_UPLOAD',
          },
        })
      }
    } else if (entityType === 'FUND') {
      const fundInvestors = await prisma.fundInvestment.findMany({
        where: { fundId: entityId, status: 'ACTIVE' },
        select: { userId: true },
      })

      for (const investor of fundInvestors) {
        await prisma.notification.create({
          data: {
            userId: investor.userId,
            title: 'New Document Uploaded',
            message: `A new document "${title}" has been uploaded for a fund you're invested in`,
            type: 'DOCUMENT_UPLOAD',
          },
        })
      }
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 