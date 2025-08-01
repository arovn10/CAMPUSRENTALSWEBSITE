import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Mock property investments data
    const mockInvestments = [
      {
        id: 'inv-1',
        propertyId: 'prop-1',
        propertyName: '2422 Joseph St.',
        propertyAddress: '2422 Joseph St, New Orleans, LA 70118',
        investmentAmount: 100000,
        currentValue: 110000,
        totalReturn: 10000,
        irr: 10.0,
        ownershipPercentage: 20,
        status: 'ACTIVE',
        investmentDate: '2024-01-20T00:00:00.000Z',
        distributions: [
          {
            id: 'dist-1',
            amount: 2500,
            distributionDate: '2024-06-01T00:00:00.000Z',
            distributionType: 'RENTAL_INCOME',
            description: 'Monthly rental income distribution',
          },
          {
            id: 'dist-2',
            amount: 2500,
            distributionDate: '2024-07-01T00:00:00.000Z',
            distributionType: 'RENTAL_INCOME',
            description: 'Monthly rental income distribution',
          },
        ],
        property: {
          id: 'prop-1',
          name: '2422 Joseph St.',
          address: '2422 Joseph St, New Orleans, LA 70118',
          description: 'Beautiful 4-bedroom property near Tulane University',
          bedrooms: 4,
          bathrooms: 2,
          price: 500000,
          squareFeet: 1400,
          propertyType: 'SINGLE_FAMILY',
          acquisitionDate: '2024-01-15T00:00:00.000Z',
          acquisitionPrice: 450000,
          currentValue: 520000,
          occupancyRate: 95,
          monthlyRent: 3500,
          annualExpenses: 15000,
          capRate: 6.5,
        },
      },
      {
        id: 'inv-2',
        propertyId: 'prop-2',
        propertyName: '2424 Joseph St',
        propertyAddress: '2424 Joseph St, New Orleans, LA 70115',
        investmentAmount: 75000,
        currentValue: 82500,
        totalReturn: 7500,
        irr: 10.0,
        ownershipPercentage: 16.67,
        status: 'ACTIVE',
        investmentDate: '2024-03-25T00:00:00.000Z',
        distributions: [
          {
            id: 'dist-3',
            amount: 1800,
            distributionDate: '2024-06-01T00:00:00.000Z',
            distributionType: 'RENTAL_INCOME',
            description: 'Monthly rental income distribution',
          },
        ],
        property: {
          id: 'prop-2',
          name: '2424 Joseph St',
          address: '2424 Joseph St, New Orleans, LA 70115',
          description: '3-bedroom property with great rental potential',
          bedrooms: 3,
          bathrooms: 2,
          price: 450000,
          squareFeet: 1200,
          propertyType: 'SINGLE_FAMILY',
          acquisitionDate: '2024-03-20T00:00:00.000Z',
          acquisitionPrice: 420000,
          currentValue: 470000,
          occupancyRate: 100,
          monthlyRent: 2800,
          annualExpenses: 12000,
          capRate: 6.8,
        },
      },
    ]

    // Filter investments based on user role
    let investments = mockInvestments
    
    if (user.role === 'INVESTOR') {
      if (user.email === 'investor1@example.com') {
        investments = mockInvestments // Investor 1 has both properties
      } else {
        investments = [] // Investor 2 has no property investments in this mock
      }
    }

    return NextResponse.json(investments)
  } catch (error) {
    console.error('Error fetching investor properties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Mock response for demonstration
    return NextResponse.json({
      id: 'new-inv-1',
      ...body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating investment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 