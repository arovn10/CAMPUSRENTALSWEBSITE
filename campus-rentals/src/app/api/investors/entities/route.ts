import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get all entities with owners (users and investor entities)
    const entities = await prisma.entity.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        entityOwners: {
          include: {
            user: true,
            investorEntity: true,
          }
        }
      }
    })
    
    return NextResponse.json(entities)
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create entities
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Create new entity
    const entity = await prisma.entity.create({
      data: {
        name: body.name,
        type: body.type,
        address: body.address,
        taxId: body.taxId,
        contactPerson: body.contactPerson,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        createdBy: user.id
      }
    })
    
    return NextResponse.json(entity, { status: 201 })
  } catch (error) {
    console.error('Error creating entity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 