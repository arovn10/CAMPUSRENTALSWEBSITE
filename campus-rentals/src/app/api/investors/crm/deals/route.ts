import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/investors/crm/deals - List all deals with filters
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get('pipelineId')
    const stageId = searchParams.get('stageId')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')

    const where: any = {}

    if (pipelineId) where.pipelineId = pipelineId
    if (stageId) where.stageId = stageId
    if (status) where.status = status
    if (assignedTo) where.assignedTo = assignedTo
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        property: true,
        pipeline: true,
        stage: true,
        sourceContact: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          take: 5,
        },
        relationships: {
          include: {
            contact: true,
          },
        },
        dealTags: true,
        _count: {
          select: {
            tasks: true,
            activities: true,
            dealNotes: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ deals })
  } catch (error: any) {
    console.error('Error fetching deals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/investors/crm/deals - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      propertyId,
      pipelineId,
      stageId,
      dealType,
      status,
      priority,
      askingPrice,
      offerPrice,
      purchasePrice,
      estimatedValue,
      capRate,
      noi,
      sourcedDate,
      underContractDate,
      dueDiligenceEnd,
      closingDate,
      expectedClosing,
      address,
      city,
      state,
      zipCode,
      country,
      description,
      notes,
      tags,
      source,
      sourceContactId,
      assignedTo,
    } = body

    const deal = await prisma.deal.create({
      data: {
        name,
        propertyId: propertyId || null,
        pipelineId: pipelineId || null,
        stageId: stageId || null,
        dealType: dealType || 'ACQUISITION',
        status: status || 'UNDER_CONTRACT',
        priority: priority || 'MEDIUM',
        askingPrice,
        offerPrice,
        purchasePrice,
        estimatedValue,
        capRate,
        noi,
        sourcedDate: sourcedDate ? new Date(sourcedDate) : null,
        underContractDate: underContractDate ? new Date(underContractDate) : null,
        dueDiligenceEnd: dueDiligenceEnd ? new Date(dueDiligenceEnd) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        expectedClosing: expectedClosing ? new Date(expectedClosing) : null,
        address,
        city,
        state,
        zipCode,
        country: country || 'US',
        description,
        notes,
        tags: tags || [],
        source,
        sourceContactId: sourceContactId || null,
        assignedTo: assignedTo || null,
        createdBy: user.id,
      },
      include: {
        property: true,
        pipeline: true,
        stage: true,
        sourceContact: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Create activity log
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        activityType: 'CREATED',
        title: 'Deal created',
        description: `Deal "${name}" was created`,
        performedBy: user.id,
      },
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating deal:', error)
    return NextResponse.json(
      { error: 'Failed to create deal', details: error.message },
      { status: 500 }
    )
  }
}

