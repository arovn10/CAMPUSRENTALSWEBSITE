import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const entityId = searchParams.get('entityId')

    if (!reportType) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      )
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1) // Start of year
    const end = endDate ? new Date(endDate) : new Date()

    switch (reportType) {
      case 'portfolio_summary':
        return await generatePortfolioSummary(user, start, end)
      
      case 'property_performance':
        return await generatePropertyPerformance(user, start, end, entityId || undefined)
      
      case 'fund_performance':
        return await generateFundPerformance(user, start, end, entityId || undefined)
      
      case 'cash_flow':
        return await generateCashFlowReport(user, start, end)
      
      case 'tax_summary':
        return await generateTaxSummary(user, start, end)
      
      case 'distribution_history':
        return await generateDistributionHistory(user, start, end)
      
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generatePortfolioSummary(user: any, startDate: Date, endDate: Date) {
  // Get all investments for the user
  const investments = await prisma.investment.findMany({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      investmentDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      property: true,
      distributions: true,
    },
  })

  const fundInvestments = await prisma.fundInvestment.findMany({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      investmentDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      fund: true,
    },
  })

  // Calculate portfolio metrics
  const totalInvested = investments.reduce((sum: number, inv: any) => sum + inv.investmentAmount, 0) +
    fundInvestments.reduce((sum: number, inv: any) => sum + inv.investmentAmount, 0)

  const totalDistributions = investments.reduce((sum: number, inv: any) => 
    sum + inv.distributions.reduce((distSum: number, dist: any) => distSum + dist.amount, 0), 0
  )

  const currentValue = investments.reduce((sum: number, inv: any) => 
    sum + (inv.property.currentValue || inv.property.price), 0
  ) + fundInvestments.reduce((sum: number, inv: any) => sum + inv.investmentAmount, 0)

  const totalReturn = currentValue + totalDistributions - totalInvested
  const totalIrr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0

  // Property breakdown
  const propertyBreakdown = investments.map((inv: any) => ({
    id: inv.property.id,
    name: inv.property.name,
    address: inv.property.address,
    investmentAmount: inv.investmentAmount,
    currentValue: inv.property.currentValue || inv.property.price,
    totalDistributions: inv.distributions.reduce((sum: number, dist: any) => sum + dist.amount, 0),
    ownershipPercentage: inv.ownershipPercentage || 100,
  }))

  // Fund breakdown
  const fundBreakdown = fundInvestments.map((inv: any) => ({
    id: inv.fund.id,
    name: inv.fund.name,
    investmentAmount: inv.investmentAmount,
    ownershipPercentage: inv.ownershipPercentage || 100,
  }))

  return NextResponse.json({
    reportType: 'portfolio_summary',
    period: { startDate, endDate },
    summary: {
      totalInvested,
      currentValue,
      totalDistributions,
      totalReturn,
      totalIrr,
      activeProperties: investments.length,
      activeFunds: fundInvestments.length,
    },
    propertyBreakdown,
    fundBreakdown,
  })
}

async function generatePropertyPerformance(user: any, startDate: Date, endDate: Date, propertyId?: string) {
  const whereClause: any = {
    userId: user.id,
    status: 'ACTIVE',
    investmentDate: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (propertyId) {
    whereClause.propertyId = propertyId
  }

  const investments = await prisma.investment.findMany({
    where: whereClause,
    include: {
      property: true,
      distributions: {
        where: {
          distributionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    },
  })

  const performanceData = investments.map((inv: any) => {
    const totalDistributions = inv.distributions.reduce((sum: number, dist: any) => sum + dist.amount, 0)
    const currentValue = inv.property.currentValue || inv.property.price
    const totalReturn = currentValue + totalDistributions - inv.investmentAmount
    const irr = inv.investmentAmount > 0 ? ((totalReturn / inv.investmentAmount) * 100) : 0

    return {
      propertyId: inv.propertyId,
      propertyName: inv.property.name,
      propertyAddress: inv.property.address,
      investmentAmount: inv.investmentAmount,
      currentValue,
      totalDistributions,
      totalReturn,
      irr,
      ownershipPercentage: inv.ownershipPercentage || 100,
      investmentDate: inv.investmentDate,
      distributions: inv.distributions,
    }
  })

  return NextResponse.json({
    reportType: 'property_performance',
    period: { startDate, endDate },
    performanceData,
  })
}

async function generateFundPerformance(user: any, startDate: Date, endDate: Date, fundId?: string) {
  const whereClause: any = {
    userId: user.id,
    status: 'ACTIVE',
    investmentDate: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (fundId) {
    whereClause.fundId = fundId
  }

  const fundInvestments = await prisma.fundInvestment.findMany({
    where: whereClause,
    include: {
      fund: true,
    },
  })

  // Get contributions and distributions for each fund investment
  const performanceData = await Promise.all(
    fundInvestments.map(async (inv) => {
      const contributions = await prisma.fundContribution.findMany({
        where: {
          fundId: inv.fundId,
          userId: inv.userId,
          contributionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      const distributions = await prisma.fundDistribution.findMany({
        where: {
          fundId: inv.fundId,
          userId: inv.userId,
          distributionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      const totalContributions = contributions.reduce((sum, contrib) => sum + contrib.amount, 0)
      const totalDistributions = distributions.reduce((sum, dist) => sum + dist.amount, 0)
      const currentValue = inv.investmentAmount // Simplified for now
      const totalReturn = currentValue + totalDistributions - totalContributions
      const irr = totalContributions > 0 ? ((totalReturn / totalContributions) * 100) : 0

      return {
        fundId: inv.fundId,
        fundName: inv.fund.name,
        investmentAmount: inv.investmentAmount,
        totalContributions,
        totalDistributions,
        currentValue,
        totalReturn,
        irr,
        ownershipPercentage: inv.ownershipPercentage || 100,
        investmentDate: inv.investmentDate,
        contributions,
        distributions,
      }
    })
  )

  return NextResponse.json({
    reportType: 'fund_performance',
    period: { startDate, endDate },
    performanceData,
  })
}

async function generateCashFlowReport(user: any, startDate: Date, endDate: Date) {
  // Get all distributions for the period
  const propertyDistributions = await prisma.distribution.findMany({
    where: {
      userId: user.id,
      distributionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      investment: {
        include: {
          property: true,
        },
      },
    },
  })

  const fundDistributions = await prisma.fundDistribution.findMany({
    where: {
      userId: user.id,
      distributionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      fund: true,
    },
  })

  // Group by month
  const monthlyCashFlow: { [key: string]: any } = {}

  // Process property distributions
  propertyDistributions.forEach(dist => {
    const month = dist.distributionDate.toISOString().slice(0, 7) // YYYY-MM format
    if (!monthlyCashFlow[month]) {
      monthlyCashFlow[month] = {
        month,
        propertyDistributions: 0,
        fundDistributions: 0,
        totalDistributions: 0,
        distributions: [],
      }
    }
    monthlyCashFlow[month].propertyDistributions += dist.amount
    monthlyCashFlow[month].totalDistributions += dist.amount
    monthlyCashFlow[month].distributions.push({
      type: 'property',
      amount: dist.amount,
      date: dist.distributionDate,
      description: dist.description,
      entityName: dist.investment.property.name,
    })
  })

  // Process fund distributions
  fundDistributions.forEach(dist => {
    const month = dist.distributionDate.toISOString().slice(0, 7)
    if (!monthlyCashFlow[month]) {
      monthlyCashFlow[month] = {
        month,
        propertyDistributions: 0,
        fundDistributions: 0,
        totalDistributions: 0,
        distributions: [],
      }
    }
    monthlyCashFlow[month].fundDistributions += dist.amount
    monthlyCashFlow[month].totalDistributions += dist.amount
    monthlyCashFlow[month].distributions.push({
      type: 'fund',
      amount: dist.amount,
      date: dist.distributionDate,
      description: dist.description,
      entityName: dist.fund.name,
    })
  })

  // Convert to array and sort by month
  const cashFlowData = Object.values(monthlyCashFlow).sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json({
    reportType: 'cash_flow',
    period: { startDate, endDate },
    cashFlowData,
    summary: {
      totalPropertyDistributions: propertyDistributions.reduce((sum, dist) => sum + dist.amount, 0),
      totalFundDistributions: fundDistributions.reduce((sum, dist) => sum + dist.amount, 0),
      totalDistributions: propertyDistributions.reduce((sum, dist) => sum + dist.amount, 0) +
        fundDistributions.reduce((sum, dist) => sum + dist.amount, 0),
    },
  })
}

async function generateTaxSummary(user: any, startDate: Date, endDate: Date) {
  // Get all distributions for tax purposes
  const propertyDistributions = await prisma.distribution.findMany({
    where: {
      userId: user.id,
      distributionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      investment: {
        include: {
          property: true,
        },
      },
    },
  })

  const fundDistributions = await prisma.fundDistribution.findMany({
    where: {
      userId: user.id,
      distributionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      fund: true,
    },
  })

  // Group by distribution type for tax reporting
  const taxSummary = {
    rentalIncome: propertyDistributions
      .filter(dist => dist.distributionType === 'RENTAL_INCOME')
      .reduce((sum, dist) => sum + dist.amount, 0),
    saleProceeds: propertyDistributions
      .filter(dist => dist.distributionType === 'SALE_PROCEEDS')
      .reduce((sum, dist) => sum + dist.amount, 0),
    refinance: propertyDistributions
      .filter(dist => dist.distributionType === 'REFINANCE')
      .reduce((sum, dist) => sum + dist.amount, 0),
    fundDistributions: fundDistributions.reduce((sum, dist) => sum + dist.amount, 0),
    totalDistributions: propertyDistributions.reduce((sum, dist) => sum + dist.amount, 0) +
      fundDistributions.reduce((sum, dist) => sum + dist.amount, 0),
  }

  return NextResponse.json({
    reportType: 'tax_summary',
    period: { startDate, endDate },
    taxSummary,
    distributions: {
      property: propertyDistributions,
      fund: fundDistributions,
    },
  })
}

async function generateDistributionHistory(user: any, startDate: Date, endDate: Date) {
  const propertyDistributions = await prisma.distribution.findMany({
    where: {
      userId: user.id,
      distributionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      investment: {
        include: {
          property: true,
        },
      },
    },
    orderBy: { distributionDate: 'desc' },
  })

  const fundDistributions = await prisma.fundDistribution.findMany({
    where: {
      userId: user.id,
      distributionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      fund: true,
    },
    orderBy: { distributionDate: 'desc' },
  })

  // Combine and sort all distributions
  const allDistributions = [
    ...propertyDistributions.map(dist => ({
      ...dist,
      entityType: 'property',
      entityName: dist.investment.property.name,
    })),
    ...fundDistributions.map(dist => ({
      ...dist,
      entityType: 'fund',
      entityName: dist.fund.name,
    })),
  ].sort((a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime())

  return NextResponse.json({
    reportType: 'distribution_history',
    period: { startDate, endDate },
    distributions: allDistributions,
    summary: {
      totalDistributions: allDistributions.length,
      totalAmount: allDistributions.reduce((sum, dist) => sum + dist.amount, 0),
      averageAmount: allDistributions.length > 0 
        ? allDistributions.reduce((sum, dist) => sum + dist.amount, 0) / allDistributions.length 
        : 0,
    },
  })
} 