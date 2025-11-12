import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/investors/crm/relationships - Create a deal-contact relationship
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
    const { dealId, contactId, role, notes } = body

    const relationship = await prisma.dealRelationship.create({
      data: {
        dealId,
        contactId,
        role,
        notes,
      },
      include: {
        contact: true,
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create activity log
    await prisma.dealActivity.create({
      data: {
        dealId,
        activityType: 'CONTACT_ADDED',
        title: 'Contact added to deal',
        description: `${relationship.contact.firstName} ${relationship.contact.lastName} was added as ${role}`,
        performedBy: user.id,
        metadata: {
          contactId: contactId,
          role: role,
        },
      },
    })

    return NextResponse.json({ relationship }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating relationship:', error)
    return NextResponse.json(
      { error: 'Failed to create relationship', details: error.message },
      { status: 500 }
    )
  }
}

