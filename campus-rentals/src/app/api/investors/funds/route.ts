import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let fundInvestments

    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      // Admin and managers can see all fund investments
      const whereClause: any = {}
      if (status) whereClause.status = status

      fundInvestments = await prisma.fundInvestment.findMany({
        where: whereClause,
        include: {
          fund: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { investmentDate: 'desc' },
      })
    } else {
      // Investors can only see their own fund investments
      const whereClause: any = {
        userId: user.id,
      }
      if (status) whereClause.status = status

      fundInvestments = await prisma.fundInvestment.findMany({
        where: whereClause,
        include: {
          fund: true,
        },
        orderBy: { investmentDate: 'desc' },
      })
    }

    // Calculate financial metrics for each fund investment
    const fundInvestmentsWithMetrics = await Promise.all(
      fundInvestments.map(async (fundInvestment: any) => {
        // Get fund contributions and distributions for this user
        const contributions = await prisma.fundContribution.findMany({
          where: {
            fundId: fundInvestment.fundId,
            userId: fundInvestment.userId,
          },
        })

        const distributions = await prisma.fundDistribution.findMany({
          where: {
            fundId: fundInvestment.fundId,
            userId: fundInvestment.userId,
          },
        })

        const totalContributions = contributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0)
        const totalDistributions = distributions.reduce((sum: number, dist: any) => sum + dist.amount, 0)
        const currentValue = fundInvestment.investmentAmount // Simplified for now
        const totalReturn = currentValue + totalDistributions - totalContributions
        const irr = totalContributions > 0 ? ((totalReturn / totalContributions) * 100) : 0

        return {
          id: fundInvestment.id,
          fundId: fundInvestment.fundId,
          fundName: fundInvestment.fund.name,
          fundDescription: fundInvestment.fund.description,
          fundType: fundInvestment.fund.fundType,
          investmentAmount: fundInvestment.investmentAmount,
          currentValue,
          totalReturn,
          irr,
          ownershipPercentage: fundInvestment.ownershipPercentage || 100,
          status: fundInvestment.status,
          investmentDate: fundInvestment.investmentDate,
          contributions,
          distributions,
          fund: {
            id: fundInvestment.fund.id,
            name: fundInvestment.fund.name,
            description: fundInvestment.fund.description,
            fundType: fundInvestment.fund.fundType,
            targetSize: fundInvestment.fund.targetSize,
            currentSize: fundInvestment.fund.currentSize,
          },
          user: fundInvestment.user,
        }
      })
    )

    return NextResponse.json(fundInvestmentsWithMetrics)
  } catch (error) {
    console.error('Error fetching investor funds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to create fund investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      fundId,
      userId,
      investmentAmount,
      ownershipPercentage,
      investmentDate,
    } = body

    // Validate required fields
    if (!fundId || !userId || !investmentAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if fund exists
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
    })

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create fund investment
    const fundInvestment = await prisma.fundInvestment.create({
      data: {
        userId,
        fundId,
        investmentAmount: parseFloat(investmentAmount),
        ownershipPercentage: ownershipPercentage ? parseFloat(ownershipPercentage) : null,
        investmentDate: investmentDate ? new Date(investmentDate) : new Date(),
        status: 'ACTIVE',
      },
      include: {
        fund: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Update fund current size
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        currentSize: {
          increment: parseFloat(investmentAmount),
        },
      },
    })

    // Create notification for the investor
    await prisma.notification.create({
      data: {
        userId,
        title: 'New Fund Investment Created',
        message: `A new fund investment of $${investmentAmount.toLocaleString()} has been created for ${fund.name}`,
        type: 'FUND_UPDATE',
      },
    })

    return NextResponse.json(fundInvestment, { status: 201 })
  } catch (error) {
    console.error('Error creating fund investment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 