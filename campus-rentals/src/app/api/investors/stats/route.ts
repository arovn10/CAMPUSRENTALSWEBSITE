import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Investor stats API called')
    
    const user = await requireAuth(request)
    console.log('User authenticated:', user.email, user.role)

    // Mock data based on user role
    let stats
    
    if (user.role === 'ADMIN') {
      stats = {
        totalInvested: 2500000,
        currentValue: 2750000,
        totalReturn: 250000,
        totalIrr: 10.0,
        activeInvestments: 15,
        totalDistributions: 180000,
        pendingDistributions: 25000,
        documentsCount: 45,
        unreadNotifications: 8,
      }
    } else if (user.role === 'MANAGER') {
      stats = {
        totalInvested: 1800000,
        currentValue: 1980000,
        totalReturn: 180000,
        totalIrr: 10.0,
        activeInvestments: 12,
        totalDistributions: 135000,
        pendingDistributions: 20000,
        documentsCount: 38,
        unreadNotifications: 5,
      }
    } else {
      // Investor data
      if (user.email === 'investor1@example.com') {
        stats = {
          totalInvested: 425000,
          currentValue: 467500,
          totalReturn: 42500,
          totalIrr: 10.0,
          activeInvestments: 3,
          totalDistributions: 6800,
          pendingDistributions: 4300,
          documentsCount: 12,
          unreadNotifications: 2,
        }
      } else {
        stats = {
          totalInvested: 650000,
          currentValue: 715000,
          totalReturn: 65000,
          totalIrr: 10.0,
          activeInvestments: 2,
          totalDistributions: 15200,
          pendingDistributions: 8000,
          documentsCount: 8,
          unreadNotifications: 1,
        }
      }
    }

    console.log('Returning stats for user:', user.email, stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching investor stats:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 