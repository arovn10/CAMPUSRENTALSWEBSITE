import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const entityId = params.id
    const body = await request.json()

    // Allow updating contact fields only for this use case
    const { contactPerson, contactEmail, contactPhone } = body || {}

    if (!contactPerson || String(contactPerson).trim() === '') {
      return NextResponse.json(
        { error: 'Contact Person is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.entity.update({
      where: { id: entityId },
      data: {
        contactPerson: String(contactPerson),
        contactEmail: contactEmail ? String(contactEmail) : null,
        contactPhone: contactPhone ? String(contactPhone) : null,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating entity contact info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


