import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/investors/crm/pipelines - List all pipelines
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const pipelines = await prisma.dealPipeline.findMany({
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
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({ pipelines })
  } catch (error: any) {
    console.error('Error fetching pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipelines', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/investors/crm/pipelines - Create a new pipeline
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
    const { name, description, isDefault, stages } = body

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.dealPipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const pipeline = await prisma.dealPipeline.create({
      data: {
        name,
        description,
        isDefault: isDefault || false,
        createdBy: user.id,
        stages: {
          create: stages?.map((stage: any, index: number) => ({
            name: stage.name,
            order: stage.order !== undefined ? stage.order : index,
            color: stage.color || null,
          })) || [],
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ pipeline }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to create pipeline', details: error.message },
      { status: 500 }
    )
  }
}

