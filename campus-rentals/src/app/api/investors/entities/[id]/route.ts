import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const entityId = params.id

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        entityOwners: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            investorEntity: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    return NextResponse.json(entity)
  } catch (error) {
    console.error('Error fetching entity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Allow updating all entity fields
    const { name, type, address, taxId, contactPerson, contactEmail, contactPhone, isActive } = body || {}

    if (!name || String(name).trim() === '') {
      return NextResponse.json(
        { error: 'Entity name is required' },
        { status: 400 }
      )
    }

    if (!contactPerson || String(contactPerson).trim() === '') {
      return NextResponse.json(
        { error: 'Contact Person is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.entity.update({
      where: { id: entityId },
      data: {
        name: String(name),
        type: type || undefined,
        address: address ? String(address) : null,
        taxId: taxId ? String(taxId) : null,
        contactPerson: String(contactPerson),
        contactEmail: contactEmail ? String(contactEmail) : null,
        contactPhone: contactPhone ? String(contactPhone) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating entity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const entityId = params.id

    // Check if entity has investments
    const investments = await prisma.entityInvestment.findMany({
      where: { entityId },
    })

    // Check if entity has owners
    const owners = await prisma.entityOwner.findMany({
      where: { entityId },
    })

    if (investments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete entity with existing investments' },
        { status: 400 }
      )
    }

    if (owners.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete entity with existing owners' },
        { status: 400 }
      )
    }

    await prisma.entity.delete({
      where: { id: entityId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting entity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


