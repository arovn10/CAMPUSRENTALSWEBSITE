import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Real database notifications only - no mock data

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Notifications requested by:', user.email)

    // Get real notifications from database
    const notifications = await prisma.notification.findMany({
      where: { 
        userId: user.id
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform to match expected format
    const formattedNotifications = notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      isRead: notif.isRead,
      createdAt: notif.createdAt.toISOString()
    }))

    return NextResponse.json(formattedNotifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Only admins and managers can create notifications
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { title, message, type, targetUsers } = body

    // Validate required fields
    if (!title || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create new notification in database
    const newNotification = await prisma.notification.create({
      data: {
        userId: targetUsers?.[0] || user.id, // For now, create for the first target user or current user
        title,
        message,
        type: type as any,
        isRead: false
      }
    })

    return NextResponse.json(newNotification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { id, isRead } = body

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    // Update notification in database
    const updatedNotification = await prisma.notification.update({
      where: { 
        id,
        userId: user.id // Ensure user can only update their own notifications
      },
      data: {
        isRead: isRead !== undefined ? isRead : undefined
      }
    })

    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 