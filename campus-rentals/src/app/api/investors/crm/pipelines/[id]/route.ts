import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// GET /api/investors/crm/pipelines/[id] - Get pipeline details
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

    const pipeline = await prisma.dealPipeline.findUnique({
      where: { id: params.id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { deals: true },
            },
          },
        },
        _count: {
          select: { deals: true },
        },
      },
    })

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    return NextResponse.json({ pipeline })
  } catch (error: any) {
    console.error('Error fetching pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/investors/crm/pipelines/[id] - Update pipeline
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
    const { name, description, isDefault, stages } = body

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.dealPipeline.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      })
    }

    const pipeline = await prisma.dealPipeline.update({
      where: { id: params.id },
      data: {
        name,
        description,
        isDefault: isDefault || false,
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    })

    // Update stages if provided
    if (stages && Array.isArray(stages)) {
      // Delete existing stages
      await prisma.dealPipelineStage.deleteMany({
        where: { pipelineId: params.id },
      })

      // Create new stages
      await prisma.dealPipelineStage.createMany({
        data: stages.map((stage: any, index: number) => ({
          pipelineId: params.id,
          name: stage.name,
          order: stage.order !== undefined ? stage.order : index,
          color: stage.color || null,
        })),
      })
    }

    const updatedPipeline = await prisma.dealPipeline.findUnique({
      where: { id: params.id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ pipeline: updatedPipeline })
  } catch (error: any) {
    console.error('Error updating pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to update pipeline', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/investors/crm/pipelines/[id] - Delete pipeline
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

    await prisma.dealPipeline.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to delete pipeline', details: error.message },
      { status: 500 }
    )
  }
}

