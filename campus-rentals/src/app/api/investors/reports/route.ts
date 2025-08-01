import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'portfolio';
    const entityId = searchParams.get('entityId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let reportData;

    switch (reportType) {
      case 'portfolio':
        reportData = await generatePortfolioReport(user.id, startDate, endDate);
        break;
      case 'property':
        if (!entityId) {
          return NextResponse.json(
            { error: 'Property ID required for property report' },
            { status: 400 }
          );
        }
        reportData = await generatePropertyReport(user.id, entityId, startDate, endDate);
        break;
      case 'fund':
        if (!entityId) {
          return NextResponse.json(
            { error: 'Fund ID required for fund report' },
            { status: 400 }
          );
        }
        reportData = await generateFundReport(user.id, entityId, startDate, endDate);
        break;
      case 'tax':
        reportData = await generateTaxReport(user.id, startDate, endDate);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generatePortfolioReport(userId: string, startDate?: string | null, endDate?: string | null) {
  // Get user investments
  const investments = await prisma.investment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      property: true,
      distributions: {
        where: {
          distributionDate: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      },
    },
  });

  // Get fund investments
  const fundInvestments = await prisma.fundInvestment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      fund: true,
      fundDistributions: {
        where: {
          distributionDate: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      },
    },
  });

  // Calculate portfolio metrics
  const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0) +
    fundInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

  const totalDistributions = investments.reduce((sum, inv) => 
    sum + inv.distributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
  ) + fundInvestments.reduce((sum, inv) => 
    sum + inv.fundDistributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
  );

  const currentValue = investments.reduce((sum, inv) => 
    sum + (inv.property.currentValue || inv.property.price), 0
  );

  const totalReturn = currentValue + totalDistributions - totalInvested;
  const irr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;

  // Property breakdown
  const propertyBreakdown = investments.map(inv => ({
    id: inv.property.id,
    name: inv.property.name,
    address: inv.property.address,
    investmentAmount: inv.investmentAmount,
    currentValue: inv.property.currentValue || inv.property.price,
    totalDistributions: inv.distributions.reduce((sum, dist) => sum + dist.amount, 0),
    irr: calculateIRR(inv.investmentAmount, inv.distributions, inv.property.currentValue || inv.property.price),
  }));

  // Fund breakdown
  const fundBreakdown = fundInvestments.map(inv => ({
    id: inv.fund.id,
    name: inv.fund.name,
    investmentAmount: inv.investmentAmount,
    totalDistributions: inv.fundDistributions.reduce((sum, dist) => sum + dist.amount, 0),
    fundType: inv.fund.fundType,
  }));

  return {
    summary: {
      totalInvested,
      currentValue,
      totalDistributions,
      totalReturn,
      irr,
      activeProperties: investments.length,
      activeFunds: fundInvestments.length,
    },
    propertyBreakdown,
    fundBreakdown,
    distributions: {
      property: investments.flatMap(inv => inv.distributions),
      fund: fundInvestments.flatMap(inv => inv.fundDistributions),
    },
  };
}

async function generatePropertyReport(userId: string, propertyId: string, startDate?: string | null, endDate?: string | null) {
  // Get property investment
  const investment = await prisma.investment.findFirst({
    where: {
      userId,
      propertyId,
      status: 'ACTIVE',
    },
    include: {
      property: {
        include: {
          propertyIncome: {
            where: {
              date: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            },
          },
          propertyExpenses: {
            where: {
              date: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            },
          },
          distributions: {
            where: {
              userId,
              distributionDate: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            },
          },
        },
      },
      distributions: {
        where: {
          distributionDate: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      },
    },
  });

  if (!investment) {
    throw new Error('Investment not found');
  }

  const property = investment.property;
  const totalIncome = property.propertyIncome.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = property.propertyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netOperatingIncome = totalIncome - totalExpenses;
  const totalDistributions = investment.distributions.reduce((sum, dist) => sum + dist.amount, 0);

  // Calculate financial metrics
  const cashOnCashReturn = investment.investmentAmount > 0 ? (netOperatingIncome / investment.investmentAmount) * 100 : 0;
  const capRate = property.currentValue ? (netOperatingIncome / property.currentValue) * 100 : 0;
  const irr = calculateIRR(investment.investmentAmount, investment.distributions, property.currentValue || property.price);

  return {
    property: {
      id: property.id,
      name: property.name,
      address: property.address,
      propertyType: property.propertyType,
      acquisitionDate: property.acquisitionDate,
      acquisitionPrice: property.acquisitionPrice,
      currentValue: property.currentValue,
      occupancyRate: property.occupancyRate,
      monthlyRent: property.monthlyRent,
    },
    investment: {
      amount: investment.investmentAmount,
      startDate: investment.startDate,
      preferredReturn: investment.preferredReturn,
      investmentType: investment.investmentType,
    },
    financials: {
      totalIncome,
      totalExpenses,
      netOperatingIncome,
      totalDistributions,
      cashOnCashReturn,
      capRate,
      irr,
    },
    income: property.propertyIncome,
    expenses: property.propertyExpenses,
    distributions: investment.distributions,
  };
}

async function generateFundReport(userId: string, fundId: string, startDate?: string | null, endDate?: string | null) {
  // Get fund investment
  const fundInvestment = await prisma.fundInvestment.findFirst({
    where: {
      userId,
      fundId,
      status: 'ACTIVE',
    },
    include: {
      fund: {
        include: {
          properties: {
            include: {
              property: true,
            },
          },
          fundDistributions: {
            where: {
              userId,
              distributionDate: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            },
          },
          waterfallConfigs: true,
        },
      },
      fundDistributions: {
        where: {
          distributionDate: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      },
    },
  });

  if (!fundInvestment) {
    throw new Error('Fund investment not found');
  }

  const fund = fundInvestment.fund;
  const totalDistributions = fundInvestment.fundDistributions.reduce((sum, dist) => sum + dist.amount, 0);
  const currentValue = fund.properties.reduce((sum, fp) => 
    sum + (fp.property.currentValue || fp.property.price) * (fp.ownershipPercentage / 100), 0
  );

  const totalReturn = currentValue + totalDistributions - fundInvestment.investmentAmount;
  const irr = fundInvestment.investmentAmount > 0 ? ((totalReturn / fundInvestment.investmentAmount) * 100) : 0;

  return {
    fund: {
      id: fund.id,
      name: fund.name,
      description: fund.description,
      fundType: fund.fundType,
      targetSize: fund.targetSize,
      startDate: fund.startDate,
      endDate: fund.endDate,
      status: fund.status,
    },
    investment: {
      amount: fundInvestment.investmentAmount,
      date: fundInvestment.investmentDate,
      preferredReturn: fundInvestment.preferredReturn,
    },
    financials: {
      totalDistributions,
      currentValue,
      totalReturn,
      irr,
    },
    properties: fund.properties.map(fp => ({
      id: fp.property.id,
      name: fp.property.name,
      address: fp.property.address,
      ownershipPercentage: fp.ownershipPercentage,
      acquisitionPrice: fp.acquisitionPrice,
      currentValue: fp.property.currentValue || fp.property.price,
    })),
    waterfallConfig: fund.waterfallConfigs[0],
    distributions: fundInvestment.fundDistributions,
  };
}

async function generateTaxReport(userId: string, startDate?: string | null, endDate?: string | null) {
  const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();

  // Get all distributions for the year
  const distributions = await prisma.distribution.findMany({
    where: {
      userId,
      taxYear: year,
    },
    include: {
      property: true,
    },
  });

  const fundDistributions = await prisma.fundDistribution.findMany({
    where: {
      userId,
      distributionDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      },
    },
    include: {
      fund: true,
    },
  });

  // Group by distribution type
  const distributionSummary = {
    preferredReturn: distributions.filter(d => d.type === 'PREFERRED_RETURN').reduce((sum, d) => sum + d.amount, 0),
    profitShare: distributions.filter(d => d.type === 'PROFIT_SHARE').reduce((sum, d) => sum + d.amount, 0),
    returnOfCapital: distributions.filter(d => d.type === 'RETURN_OF_CAPITAL').reduce((sum, d) => sum + d.amount, 0),
    saleProceeds: distributions.filter(d => d.type === 'SALE_PROCEEDS').reduce((sum, d) => sum + d.amount, 0),
  };

  const fundDistributionSummary = {
    preferredReturn: fundDistributions.filter(d => d.type === 'PREFERRED_RETURN').reduce((sum, d) => sum + d.amount, 0),
    profitShare: fundDistributions.filter(d => d.type === 'PROFIT_SHARE').reduce((sum, d) => sum + d.amount, 0),
    returnOfCapital: fundDistributions.filter(d => d.type === 'RETURN_OF_CAPITAL').reduce((sum, d) => sum + d.amount, 0),
    saleProceeds: fundDistributions.filter(d => d.type === 'SALE_PROCEEDS').reduce((sum, d) => sum + d.amount, 0),
  };

  return {
    taxYear: year,
    propertyDistributions: {
      summary: distributionSummary,
      details: distributions,
    },
    fundDistributions: {
      summary: fundDistributionSummary,
      details: fundDistributions,
    },
    totalDistributions: {
      property: Object.values(distributionSummary).reduce((sum, val) => sum + val, 0),
      fund: Object.values(fundDistributionSummary).reduce((sum, val) => sum + val, 0),
    },
  };
}

function calculateIRR(initialInvestment: number, distributions: any[], currentValue: number): number {
  // Simple IRR calculation - in production, you'd use a more sophisticated algorithm
  const totalDistributions = distributions.reduce((sum, dist) => sum + dist.amount, 0);
  const totalReturn = currentValue + totalDistributions - initialInvestment;
  return initialInvestment > 0 ? ((totalReturn / initialInvestment) * 100) : 0;
} 