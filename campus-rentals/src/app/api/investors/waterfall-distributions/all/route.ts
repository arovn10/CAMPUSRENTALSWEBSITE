import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get all waterfall distributions (including global ones)
    const distributions = await prisma.waterfallDistribution.findMany({
      include: {
        waterfallStructure: {
          include: {
            waterfallTiers: {
              include: {
                tierDistributions: {
                  include: {
                    user: true,
                    entityInvestment: {
                      include: {
                        entity: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { distributionDate: 'desc' }
    })
    
    console.log('Fetching all distributions (including global)')
    console.log('Found distributions:', distributions.length)
    console.log('Distribution details:', distributions.map((d: any) => ({
      id: d.id,
      totalAmount: d.totalAmount,
      distributionDate: d.distributionDate,
      structureName: d.waterfallStructure.name,
      structureId: d.waterfallStructure.id,
      propertyId: d.waterfallStructure.propertyId
    })))
    
    return NextResponse.json(distributions)
  } catch (error) {
    console.error('Error fetching all waterfall distributions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 