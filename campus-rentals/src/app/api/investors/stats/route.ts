import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { positionIrrPercent, type CashFlow } from '@/lib/ims/metrics'

export async function GET(request: NextRequest) {
  try {
    console.log('Investor stats API called')
    
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.log('User authenticated:', user.email, user.role)

    // Get real data from database
    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      include: { 
        property: true,
        distributions: true
      }
    })

    const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.investmentAmount ?? 0), 0)
    const totalCurrentValue = investments.reduce((sum, inv) => sum + Number(inv.property?.currentValue ?? inv.investmentAmount ?? 0), 0)
    const totalDistributions = investments.reduce((sum, inv) => sum + inv.distributions.reduce((dSum, dist) => dSum + Number(dist.amount), 0), 0)
    // Total return = (current value + distributions received) - invested (consistent with reports & investments API)
    const totalReturn = totalCurrentValue - totalInvested + totalDistributions
    // True consolidated XIRR (%) over every dated contribution/distribution + terminal value,
    // replacing the legacy (totalReturn / invested) * 100 ratio.
    const asOf = new Date()
    const contributions: CashFlow[] = investments
      .filter(inv => Number(inv.investmentAmount ?? 0) > 0)
      .map(inv => ({ amount: Number(inv.investmentAmount), date: inv.investmentDate ?? inv.createdAt }))
    const distributions: CashFlow[] = investments.flatMap(inv =>
      inv.distributions.map(d => ({ amount: Number(d.amount), date: d.distributionDate }))
    )
    const totalIrr = positionIrrPercent({ contributions, distributions, currentValue: totalCurrentValue, asOf })
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length

    // Pending distributions (estimated from monthly rent)
    const pendingDistributions = investments.reduce((sum, inv) => {
      const monthlyRent = Number(inv.property?.monthlyRent ?? 0)
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
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined },
      { status: 500 }
    )
  }
} 