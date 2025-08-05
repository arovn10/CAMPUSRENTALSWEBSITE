import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Real database fund investments only - no mock data

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Fund investments requested by:', user.email)

    // Get real fund investments from database
    const fundInvestments = await prisma.fundInvestment.findMany({
      where: { 
        userId: user.id
      },
      include: {
        fund: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get contributions and distributions separately
    const fundIds = fundInvestments.map(fi => fi.fundId)
    
    const [contributions, distributions] = await Promise.all([
      prisma.fundContribution.findMany({
        where: { 
          fundId: { in: fundIds },
          userId: user.id
        }
      }),
      prisma.fundDistribution.findMany({
        where: { 
          fundId: { in: fundIds },
          userId: user.id
        }
      })
    ])

    // Transform to match expected format
    const formattedFundInvestments = fundInvestments.map(fundInv => {
      const fundContributions = contributions.filter(c => c.fundId === fundInv.fundId)
      const fundDistributions = distributions.filter(d => d.fundId === fundInv.fundId)
      
      return {
        id: fundInv.id,
        fundId: fundInv.fundId,
        fundName: fundInv.fund.name,
        investmentAmount: fundInv.investmentAmount,
        ownershipPercentage: fundInv.ownershipPercentage,
        status: fundInv.status,
        investmentDate: fundInv.createdAt.toISOString(),
        contributions: fundContributions.map(contrib => ({
          id: contrib.id,
          amount: contrib.amount,
          contributionDate: contrib.contributionDate.toISOString(),
          contributionType: contrib.contributionType,
          description: contrib.description
        })),
        distributions: fundDistributions.map(dist => ({
          id: dist.id,
          amount: dist.amount,
          distributionDate: dist.distributionDate.toISOString(),
          distributionType: dist.distributionType,
          description: dist.description
        }))
      }
    })

    return NextResponse.json(formattedFundInvestments)
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

    // Create new fund investment in database
    const newFundInvestment = await prisma.fundInvestment.create({
      data: {
        userId: investorId || user.id,
        fundId,
        investmentAmount: parseFloat(investmentAmount),
        ownershipPercentage: parseFloat(ownershipPercentage),
        status: 'ACTIVE'
      }
    })

    // Create initial contribution
    await prisma.fundContribution.create({
      data: {
        fundId,
        userId: investorId || user.id,
        amount: parseFloat(investmentAmount),
        contributionDate: new Date(),
        contributionType: 'CAPITAL_CALL',
        description: 'Initial capital contribution'
      }
    })

    return NextResponse.json(newFundInvestment, { status: 201 })
  } catch (error) {
    console.error('Error creating fund investment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 