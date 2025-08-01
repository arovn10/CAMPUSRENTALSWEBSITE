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

    let stats;

    if (user.role === 'ADMIN') {
      // Admin gets overall portfolio stats
      const investments = await prisma.investment.findMany({
        where: { status: 'ACTIVE' },
        include: {
          property: true,
          distributions: true,
        },
      });

      const fundInvestments = await prisma.fundInvestment.findMany({
        where: { status: 'ACTIVE' },
        include: {
          fund: true,
          fundDistributions: true,
        },
      });

      const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0) +
        fundInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

      const totalDistributions = investments.reduce((sum, inv) => 
        sum + inv.distributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
      ) + fundInvestments.reduce((sum, inv) => 
        sum + inv.fundDistributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
      );

      const totalValue = investments.reduce((sum, inv) => sum + (inv.property.currentValue || inv.property.price), 0) +
        fundInvestments.reduce((sum, inv) => {
          const fundValue = inv.fund.properties?.reduce((fundSum, fp) => 
            fundSum + (fp.property.currentValue || fp.property.price) * (fp.ownershipPercentage / 100), 0
          ) || 0;
          return sum + fundValue;
        }, 0);

      const totalReturn = totalValue + totalDistributions - totalInvested;
      const averageIrr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
      const activeProperties = new Set(investments.map(inv => inv.propertyId)).size;
      const activeFunds = new Set(fundInvestments.map(inv => inv.fundId)).size;

      stats = {
        totalInvested,
        totalValue,
        totalReturn,
        averageIrr,
        activeProperties,
        activeFunds,
        totalDistributions,
      };
    } else {
      // Investor gets their personal stats
      const investments = await prisma.investment.findMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          property: true,
          distributions: true,
        },
      });

      const fundInvestments = await prisma.fundInvestment.findMany({
        where: {
          userId: user.id,
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
            },
          },
          fundDistributions: true,
        },
      });

      const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0) +
        fundInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

      const totalDistributions = investments.reduce((sum, inv) => 
        sum + inv.distributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
      ) + fundInvestments.reduce((sum, inv) => 
        sum + inv.fundDistributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
      );
      
      // Calculate current value based on property values and investment percentage
      let totalValue = 0;
      
      // Property investments
      investments.forEach(investment => {
        const propertyValue = investment.property.currentValue || investment.property.price || 0;
        // For direct property investments, assume full ownership of the investment amount
        totalValue += propertyValue;
      });

      // Fund investments
      fundInvestments.forEach(investment => {
        const fundValue = investment.fund.properties?.reduce((sum, fp) => 
          sum + (fp.property.currentValue || fp.property.price) * (fp.ownershipPercentage / 100), 0
        ) || 0;
        
        // Calculate investor's share of the fund value
        const totalFundInvestment = investment.fund.fundInvestments?.reduce((sum, fi) => sum + fi.investmentAmount, 0) || investment.investmentAmount;
        const investorShare = totalFundInvestment > 0 ? (investment.investmentAmount / totalFundInvestment) : 1;
        totalValue += fundValue * investorShare;
      });

      const totalReturn = totalValue + totalDistributions - totalInvested;
      const averageIrr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
      const activeProperties = investments.length;
      const activeFunds = fundInvestments.length;

      stats = {
        totalInvested,
        totalValue,
        totalReturn,
        averageIrr,
        activeProperties,
        activeFunds,
        totalDistributions,
      };
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching investor stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 