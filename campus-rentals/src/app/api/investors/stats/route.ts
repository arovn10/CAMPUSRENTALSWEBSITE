import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Investor stats API called')
    
    const user = await requireAuth(request)
    console.log('User authenticated:', user.email, user.role)

    // Get real data from database
    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      include: { 
        property: true,
        distributions: true
      }
    })

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.investmentAmount ?? 0), 0)
    const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.property?.currentValue ?? inv.investmentAmount ?? 0), 0)
    const totalDistributions = investments.reduce((sum, inv) => sum + inv.distributions.reduce((dSum, dist) => dSum + dist.amount, 0), 0)
    // Total return = (current value + distributions received) - invested (consistent with reports & investments API)
    const totalReturn = totalCurrentValue - totalInvested + totalDistributions
    // Simple ROI % including distributions (same formula as reports/investments)
    const totalIrr = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length

    // Pending distributions (estimated from monthly rent)
    const pendingDistributions = investments.reduce((sum, inv) => {
      const monthlyRent = inv.property?.monthlyRent ?? 0
      return sum + (monthlyRent * 0.8) // 80% of monthly rent as distribution
    }, 0)

    const propertyIds = [...new Set(investments.map((i) => i.propertyId).filter(Boolean))]
    const [documentsCount, unreadResult] = await Promise.all([
      prisma.document.count({
        where: {
          isPublic: true,
          visibleToInvestor: true,
          OR: [
            { uploadedBy: user.id },
            ...(propertyIds.length > 0 ? [{ entityType: 'PROPERTY' as const, entityId: { in: propertyIds } }] : []),
          ],
        },
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ])

    const stats = {
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(totalCurrentValue),
      totalReturn: Math.round(totalReturn),
      totalIrr: Math.round(totalIrr * 100) / 100,
      activeInvestments,
      totalDistributions: Math.round(totalDistributions),
      pendingDistributions: Math.round(pendingDistributions),
      documentsCount,
      unreadNotifications: unreadResult,
    }

    console.log('Returning real stats for user:', user.email, stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching investor stats:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 