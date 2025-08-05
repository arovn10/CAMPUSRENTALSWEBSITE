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
    
    // Get insurance records for the property
    const insuranceRecords = await prisma.insurance.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(insuranceRecords)
  } catch (error) {
    console.error('Error fetching insurance records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create insurance records
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Create insurance record
    const insuranceRecord = await prisma.insurance.create({
      data: {
        propertyId: body.propertyId,
        provider: body.provider,
        policyNumber: body.policyNumber,
        annualPremium: parseFloat(body.annualPremium),
        coverageAmount: parseFloat(body.coverageAmount),
        renewalDate: new Date(body.renewalDate),
        notes: body.notes || '',
        createdBy: user.id
      }
    })
    
    return NextResponse.json(insuranceRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating insurance record:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 