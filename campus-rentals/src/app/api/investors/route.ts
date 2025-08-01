import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Get user's investments
    const investments = await prisma.investment.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        property: true,
        distributions: true,
      },
    })

    // Get user's fund investments
    const fundInvestments = await prisma.fundInvestment.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        fund: true,
      },
    })

    // Calculate property investment stats
    let totalInvested = 0
    let currentValue = 0
    let totalReturn = 0
    let totalDistributions = 0
    let activeInvestments = 0

    // Property investments
    investments.forEach((investment: any) => {
      totalInvested += investment.investmentAmount
      currentValue += investment.property.currentValue || investment.property.price
      totalDistributions += investment.distributions.reduce((sum: number, dist: any) => sum + dist.amount, 0)
      activeInvestments++
    })

    // Fund investments
    fundInvestments.forEach((fundInvestment: any) => {
      totalInvested += fundInvestment.investmentAmount
      // For funds, we'll use the investment amount as current value for now
      currentValue += fundInvestment.investmentAmount
      activeInvestments++
    })

    // Calculate total return
    totalReturn = currentValue + totalDistributions - totalInvested

    // Calculate IRR (simplified calculation)
    const totalIrr = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0

    // Get pending distributions (distributions from last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const pendingDistributions = await prisma.distribution.aggregate({
      where: {
        userId: user.id,
        distributionDate: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Get documents count
    const documentsCount = await prisma.document.count({
      where: {
        OR: [
          { isPublic: true },
          { uploadedBy: user.id },
          {
            entityType: 'PROPERTY',
            entityId: {
              in: investments.map((inv: any) => inv.propertyId),
            },
          },
          {
            entityType: 'FUND',
            entityId: {
              in: fundInvestments.map((inv: any) => inv.fundId),
            },
          },
        ],
      },
    })

    // Get unread notifications count
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    const stats = {
      totalInvested,
      currentValue,
      totalReturn,
      totalIrr,
      activeInvestments,
      totalDistributions,
      pendingDistributions: pendingDistributions._sum.amount || 0,
      documentsCount,
      unreadNotifications,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching investor stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 