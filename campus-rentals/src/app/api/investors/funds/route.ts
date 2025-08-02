import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// Mock fund investments data
const FUND_INVESTMENTS = [
  {
    id: 'fund-1',
    fundId: 'campus-fund-1',
    fundName: 'Campus Rentals Fund I',
    investmentAmount: 500000,
    ownershipPercentage: 15.5,
    status: 'ACTIVE',
    investmentDate: '2024-01-15T00:00:00.000Z',
    contributions: [
      {
        id: 'contrib-1',
        amount: 250000,
        contributionDate: '2024-01-15T00:00:00.000Z',
        contributionType: 'INITIAL',
        description: 'Initial capital contribution'
      },
      {
        id: 'contrib-2',
        amount: 250000,
        contributionDate: '2024-03-15T00:00:00.000Z',
        contributionType: 'FOLLOW_ON',
        description: 'Follow-on investment'
      }
    ],
    distributions: [
      {
        id: 'dist-1',
        amount: 75000,
        distributionDate: '2024-06-15T00:00:00.000Z',
        distributionType: 'QUARTERLY',
        description: 'Q2 2024 distribution'
      }
    ]
  },
  {
    id: 'fund-2',
    fundId: 'campus-fund-2',
    fundName: 'Campus Rentals Fund II',
    investmentAmount: 750000,
    ownershipPercentage: 12.0,
    status: 'ACTIVE',
    investmentDate: '2024-02-01T00:00:00.000Z',
    contributions: [
      {
        id: 'contrib-3',
        amount: 750000,
        contributionDate: '2024-02-01T00:00:00.000Z',
        contributionType: 'INITIAL',
        description: 'Initial capital contribution'
      }
    ],
    distributions: []
  }
]

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Fund investments requested by:', user.email)

    // Filter fund investments based on user role
    let fundInvestments = FUND_INVESTMENTS

    if (user.role === 'INVESTOR') {
      // For investors, only show their own investments
      // In a real app, you'd filter by actual investor ID
      fundInvestments = FUND_INVESTMENTS.filter(fund => 
        fund.fundName.includes('Fund I') // Mock filtering
      )
    }

    return NextResponse.json(fundInvestments)
  } catch (error) {
    console.error('Error fetching fund investments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Only admins and managers can create fund investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { fundId, fundName, investmentAmount, ownershipPercentage, investorId } = body

    // Validate required fields
    if (!fundId || !fundName || !investmentAmount || !ownershipPercentage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create new fund investment
    const newFundInvestment = {
      id: `fund-${Date.now()}`,
      fundId,
      fundName,
      investmentAmount: parseFloat(investmentAmount),
      ownershipPercentage: parseFloat(ownershipPercentage),
      status: 'ACTIVE',
      investmentDate: new Date().toISOString(),
      contributions: [
        {
          id: `contrib-${Date.now()}`,
          amount: parseFloat(investmentAmount),
          contributionDate: new Date().toISOString(),
          contributionType: 'INITIAL',
          description: 'Initial capital contribution'
        }
      ],
      distributions: []
    }

    // In a real app, you'd save this to the database
    FUND_INVESTMENTS.push(newFundInvestment)

    return NextResponse.json(newFundInvestment, { status: 201 })
  } catch (error) {
    console.error('Error creating fund investment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 