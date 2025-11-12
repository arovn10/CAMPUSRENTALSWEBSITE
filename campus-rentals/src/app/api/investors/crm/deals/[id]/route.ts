import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// GET /api/investors/crm/deals/[id] - Get deal details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        property: true,
        pipeline: {
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
          },
        },
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
          include: {
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
          },
          orderBy: [
            { status: 'asc' },
            { dueDate: 'asc' },
          ],
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        dealNotes: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        relationships: {
          include: {
            contact: true,
          },
        },
        dealTags: true,
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json({ deal })
  } catch (error: any) {
    console.error('Error fetching deal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/investors/crm/deals/[id] - Update deal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
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

    // Get old deal to track changes
    const oldDeal = await prisma.deal.findUnique({
      where: { id: params.id },
    })

    if (!oldDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        name,
        propertyId: propertyId !== undefined ? (propertyId || null) : undefined,
        pipelineId: pipelineId !== undefined ? (pipelineId || null) : undefined,
        stageId: stageId !== undefined ? (stageId || null) : undefined,
        dealType,
        status,
        priority,
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
        country,
        description,
        notes,
        tags: tags || [],
        source,
        sourceContactId: sourceContactId !== undefined ? (sourceContactId || null) : undefined,
        assignedTo: assignedTo !== undefined ? (assignedTo || null) : undefined,
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

    // Log activity for significant changes
    const changes: string[] = []
    if (oldDeal.stageId !== deal.stageId) {
      changes.push('stage changed')
    }
    if (oldDeal.status !== deal.status) {
      changes.push('status changed')
    }
    if (oldDeal.assignedTo !== deal.assignedTo) {
      changes.push('assignment changed')
    }

    if (changes.length > 0) {
      await prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          activityType: changes.includes('stage changed') ? 'STAGE_CHANGED' : 'UPDATED',
          title: `Deal updated: ${changes.join(', ')}`,
          description: `Deal "${deal.name}" was updated`,
          performedBy: user.id,
          metadata: {
            oldValues: {
              stageId: oldDeal.stageId,
              status: oldDeal.status,
              assignedTo: oldDeal.assignedTo,
            },
            newValues: {
              stageId: deal.stageId,
              status: deal.status,
              assignedTo: deal.assignedTo,
            },
          },
        },
      })
    }

    return NextResponse.json({ deal })
  } catch (error: any) {
    console.error('Error updating deal:', error)
    return NextResponse.json(
      { error: 'Failed to update deal', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/investors/crm/deals/[id] - Delete deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    await prisma.deal.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting deal:', error)
    return NextResponse.json(
      { error: 'Failed to delete deal', details: error.message },
      { status: 500 }
    )
  }
}

