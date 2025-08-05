import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }
    
    // Get tax records for the property
    const taxRecords = await prisma.propertyTax.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(taxRecords)
  } catch (error) {
    console.error('Error fetching tax records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create tax records
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Create tax record
    const taxRecord = await prisma.propertyTax.create({
      data: {
        propertyId: body.propertyId,
        taxYear: parseInt(body.taxYear),
        annualPropertyTax: parseFloat(body.annualPropertyTax),
        notes: body.notes || '',
        createdBy: user.id
      }
    })
    
    return NextResponse.json(taxRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating tax record:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 