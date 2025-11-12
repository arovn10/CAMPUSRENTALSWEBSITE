import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// GET /api/investors/crm/tasks - List tasks with filters
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get('dealId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const where: any = {}
    if (dealId) where.dealId = dealId
    if (assignedTo) where.assignedTo = assignedTo
    if (status) where.status = status
    if (priority) where.priority = priority

    const tasks = await prisma.dealTask.findMany({
      where,
      include: {
        deal: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
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
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/investors/crm/tasks - Create a new task
export async function POST(request: NextRequest) {
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
    const { dealId, title, description, status, priority, dueDate, assignedTo } = body

    const task = await prisma.dealTask.create({
      data: {
        dealId,
        title,
        description,
        status: status || 'PENDING',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
        createdBy: user.id,
      },
      include: {
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
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
        dealId,
        activityType: 'TASK_CREATED',
        title: 'Task created',
        description: `Task "${title}" was created`,
        performedBy: user.id,
        metadata: {
          taskId: task.id,
        },
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task', details: error.message },
      { status: 500 }
    )
  }
}

