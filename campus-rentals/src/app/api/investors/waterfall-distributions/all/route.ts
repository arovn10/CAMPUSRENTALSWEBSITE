import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get propertyId from query params to filter distributions
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    
    // Build where clause to filter by property
    const whereClause: any = {}
    
    if (propertyId) {
      // Only get distributions for structures tied to this specific property
      whereClause.waterfallStructure = {
        propertyId: propertyId
      }
    }
    
    // Get waterfall distributions filtered by property
    const distributions = await prisma.waterfallDistribution.findMany({
      where: whereClause,
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
            },
            property: true
          }
        }
      },
      orderBy: { distributionDate: 'desc' }
    })
    
    return NextResponse.json(distributions)
  } catch (error) {
    console.error('Error fetching waterfall distributions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 