import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// PUT /api/investors/crm/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, status, priority, dueDate, assignedTo } = body

    const oldTask = await prisma.dealTask.findUnique({
      where: { id: params.id },
    })

    if (!oldTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = await prisma.dealTask.update({
      where: { id: params.id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo !== undefined ? (assignedTo || null) : undefined,
        completedDate: status === 'COMPLETED' && oldTask.status !== 'COMPLETED' 
          ? new Date() 
          : status !== 'COMPLETED' 
            ? null 
            : oldTask.completedDate,
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

    // Log activity if task was completed
    if (status === 'COMPLETED' && oldTask.status !== 'COMPLETED') {
      await prisma.dealActivity.create({
        data: {
          dealId: task.dealId,
          activityType: 'TASK_COMPLETED',
          title: 'Task completed',
          description: `Task "${task.title}" was completed`,
          performedBy: user.id,
          metadata: {
            taskId: task.id,
          },
        },
      })
    }

    return NextResponse.json({ task })
  } catch (error: any) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/investors/crm/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    await prisma.dealTask.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task', details: error.message },
      { status: 500 }
    )
  }
}

