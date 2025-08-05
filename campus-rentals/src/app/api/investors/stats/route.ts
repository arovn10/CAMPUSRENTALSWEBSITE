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

    const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0)
    const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.property.currentValue || inv.investmentAmount), 0)
    const totalReturn = totalCurrentValue - totalInvested
    const totalIrr = totalInvested > 0 ? ((totalCurrentValue / totalInvested - 1) * 100) : 0
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length
    const totalDistributions = investments.reduce((sum, inv) => sum + inv.distributions.reduce((dSum, dist) => dSum + dist.amount, 0), 0)
    
    // Calculate pending distributions (estimated monthly rent)
    const pendingDistributions = investments.reduce((sum, inv) => {
      const monthlyRent = inv.property.monthlyRent || 0
      return sum + (monthlyRent * 0.8) // 80% of monthly rent as distribution
    }, 0)

    const stats = {
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(totalCurrentValue),
      totalReturn: Math.round(totalReturn),
      totalIrr: Math.round(totalIrr * 100) / 100,
      activeInvestments,
      totalDistributions: Math.round(totalDistributions),
      pendingDistributions: Math.round(pendingDistributions),
      documentsCount: 0, // Will be calculated from real documents
      unreadNotifications: 0, // Will be calculated from real notifications
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