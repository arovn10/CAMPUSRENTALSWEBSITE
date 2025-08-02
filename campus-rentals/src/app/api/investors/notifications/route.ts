import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// Mock notifications data
const NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Q2 2024 Distribution Available',
    message: 'Your quarterly distribution of $75,000 is now available for withdrawal.',
    type: 'DISTRIBUTION',
    isRead: false,
    createdAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'notif-2',
    title: 'New Property Acquisition',
    message: 'Campus Rentals has acquired a new property at 789 Pine Street. Investment opportunities available.',
    type: 'PROPERTY_UPDATE',
    isRead: false,
    createdAt: '2024-06-10T14:30:00.000Z',
  },
  {
    id: 'notif-3',
    title: 'Tax Documents Available',
    message: 'Your 2023 tax documents are now available in the Documents section.',
    type: 'DOCUMENT_UPLOAD',
    isRead: true,
    createdAt: '2024-03-15T09:00:00.000Z',
  },
  {
    id: 'notif-4',
    title: 'Fund Performance Update',
    message: 'Campus Rentals Fund I has achieved 12.5% IRR year-to-date.',
    type: 'PERFORMANCE_UPDATE',
    isRead: true,
    createdAt: '2024-06-01T11:00:00.000Z',
  },
  {
    id: 'notif-5',
    title: 'Annual Meeting Scheduled',
    message: 'The annual investor meeting is scheduled for July 15th, 2024 at 2:00 PM EST.',
    type: 'MEETING',
    isRead: false,
    createdAt: '2024-05-20T16:00:00.000Z',
  },
  {
    id: 'notif-6',
    title: 'Property Renovation Complete',
    message: 'Renovations at 123 Main Street have been completed. Property is now fully leased.',
    type: 'PROPERTY_UPDATE',
    isRead: true,
    createdAt: '2024-05-15T13:00:00.000Z',
  }
]

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Notifications requested by:', user.email)

    // Filter notifications based on user role
    let notifications = NOTIFICATIONS

    if (user.role === 'INVESTOR') {
      // For investors, show all notifications (they're all relevant)
      notifications = NOTIFICATIONS
    } else if (user.role === 'MANAGER') {
      // Managers see most notifications but not admin-specific ones
      notifications = NOTIFICATIONS.filter(notif => 
        !notif.type.includes('ADMIN')
      )
    }
    // Admins see all notifications

    return NextResponse.json(notifications)
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

    // Create new notification
    const newNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
    }

    // In a real app, you'd save this to the database and send to target users
    NOTIFICATIONS.unshift(newNotification) // Add to beginning of array

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

    // Find and update notification
    const notificationIndex = NOTIFICATIONS.findIndex(n => n.id === id)
    if (notificationIndex === -1) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    NOTIFICATIONS[notificationIndex] = {
      ...NOTIFICATIONS[notificationIndex],
      isRead: isRead !== undefined ? isRead : NOTIFICATIONS[notificationIndex].isRead
    }

    return NextResponse.json(NOTIFICATIONS[notificationIndex])
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 