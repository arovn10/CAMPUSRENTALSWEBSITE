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

      const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
      const totalDistributions = investments.reduce((sum, inv) => 
        sum + inv.distributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
      );
      const totalValue = investments.reduce((sum, inv) => sum + (inv.property.price || 0), 0);
      const totalReturn = totalValue + totalDistributions - totalInvested;
      const averageIrr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
      const activeProperties = new Set(investments.map(inv => inv.propertyId)).size;

      stats = {
        totalInvested,
        totalValue,
        totalReturn,
        averageIrr,
        activeProperties,
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

      const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
      const totalDistributions = investments.reduce((sum, inv) => 
        sum + inv.distributions.reduce((distSum, dist) => distSum + dist.amount, 0), 0
      );
      
      // Calculate current value based on property values and investment percentage
      let totalValue = 0;
      investments.forEach(investment => {
        const propertyValue = investment.property.price || 0;
        const totalPropertyInvestment = 0; // This would need to be calculated from all investments in the property
        const investmentPercentage = totalPropertyInvestment > 0 ? 
          (investment.investmentAmount / totalPropertyInvestment) : 1;
        totalValue += propertyValue * investmentPercentage;
      });

      const totalReturn = totalValue + totalDistributions - totalInvested;
      const averageIrr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
      const activeProperties = investments.length;

      stats = {
        totalInvested,
        totalValue,
        totalReturn,
        averageIrr,
        activeProperties,
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