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

    let funds;

    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      // Admin and sponsors can see all funds
      funds = await prisma.fund.findMany({
        where: { status: 'ACTIVE' },
        include: {
          sponsor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          fundInvestments: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          fundDistributions: true,
          properties: {
            include: {
              property: true,
            },
          },
          waterfallConfigs: true,
          documents: {
            where: { isPublic: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      // Investors can only see funds they're invested in
      const fundInvestments = await prisma.fundInvestment.findMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          fund: {
            include: {
              sponsor: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              fundDistributions: {
                where: {
                  userId: user.id,
                },
              },
              properties: {
                include: {
                  property: true,
                },
              },
              waterfallConfigs: true,
              documents: {
                where: { isPublic: true },
              },
            },
          },
          fundDistributions: true,
        },
      });

      funds = fundInvestments.map(investment => ({
        ...investment.fund,
        userInvestment: {
          amount: investment.investmentAmount,
          date: investment.investmentDate,
          preferredReturn: investment.preferredReturn,
          status: investment.status,
        },
        userDistributions: investment.fundDistributions,
      }));
    }

    // Calculate financial metrics for each fund
    const fundsWithMetrics = funds.map(fund => {
      const totalInvested = fund.fundInvestments?.reduce((sum, inv) => sum + inv.investmentAmount, 0) || 0;
      const totalDistributions = fund.fundDistributions?.reduce((sum, dist) => sum + dist.amount, 0) || 0;
      
      // Calculate fund performance metrics
      const currentValue = fund.properties?.reduce((sum, fp) => sum + (fp.property.currentValue || fp.property.price), 0) || 0;
      const totalReturn = currentValue + totalDistributions - totalInvested;
      const irr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;

      // Calculate fund utilization
      const utilization = fund.targetSize > 0 ? (totalInvested / fund.targetSize) * 100 : 0;

      return {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        fundType: fund.fundType,
        targetSize: fund.targetSize,
        minimumInvestment: fund.minimumInvestment,
        maximumInvestment: fund.maximumInvestment,
        startDate: fund.startDate,
        endDate: fund.endDate,
        status: fund.status,
        sponsor: fund.sponsor,
        totalInvested,
        totalDistributions,
        currentValue,
        totalReturn,
        irr,
        utilization,
        properties: fund.properties?.map(fp => ({
          id: fp.property.id,
          name: fp.property.name,
          address: fp.property.address,
          ownershipPercentage: fp.ownershipPercentage,
          acquisitionPrice: fp.acquisitionPrice,
          currentValue: fp.property.currentValue || fp.property.price,
        })),
        waterfallConfig: fund.waterfallConfigs?.[0],
        documents: fund.documents,
        userInvestment: (fund as any).userInvestment,
        userDistributions: (fund as any).userDistributions,
      };
    });

    return NextResponse.json(fundsWithMetrics);
  } catch (error) {
    console.error('Error fetching investor funds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 