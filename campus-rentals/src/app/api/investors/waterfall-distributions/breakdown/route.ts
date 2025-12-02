import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to view distributions
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const distributionId = searchParams.get('id')
    
    if (!distributionId) {
      return NextResponse.json(
        { error: 'Distribution ID is required' },
        { status: 400 }
      )
    }
    
    // First get the waterfall distribution to get the distribution date
    const waterfallDistribution = await prisma.waterfallDistribution.findUnique({
      where: { id: distributionId },
      include: {
        waterfallStructure: {
          include: {
            waterfallTiers: {
              include: {
                tierDistributions: {
                  include: {
                    entityInvestment: {
                      include: {
                        entity: {
                          include: {
                            entityOwners: {
                              include: {
                                user: true
                              }
                            }
                          }
                        }
                      }
                    },
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!waterfallDistribution) {
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      )
    }
    
    // Group breakdown by tier and recipient type
    const breakdownByTier: { [key: string]: any } = {}
    const entityBreakdown: any[] = []
    const investorBreakdown: any[] = []
    
    for (const tier of waterfallDistribution.waterfallStructure.waterfallTiers) {
      for (const tierDistribution of tier.tierDistributions) {
        const tierName = tier.tierName
        
        if (!breakdownByTier[tierName]) {
          breakdownByTier[tierName] = {
            tierType: tier.tierType,
            totalAmount: 0,
            entities: [],
            investors: []
          }
        }
        
        breakdownByTier[tierName].totalAmount += tierDistribution.distributionAmount
        
        if (tierDistribution.entityInvestment) {
          // Entity distribution
          const entityName = tierDistribution.entityInvestment.entity.name
          const existingEntity = breakdownByTier[tierName].entities.find((e: any) => e.name === entityName)
          
          if (existingEntity) {
            existingEntity.amount += tierDistribution.distributionAmount
          } else {
            breakdownByTier[tierName].entities.push({
              name: entityName,
              amount: tierDistribution.distributionAmount,
              ownershipPercentage: tierDistribution.entityInvestment.ownershipPercentage
            })
          }
          
          entityBreakdown.push({
            tier: tierName,
            entity: entityName,
            amount: tierDistribution.distributionAmount,
            ownershipPercentage: tierDistribution.entityInvestment.ownershipPercentage
          })
        } else if (tierDistribution.user) {
          // Direct investor distribution
          const investorName = `${tierDistribution.user.firstName} ${tierDistribution.user.lastName}`
          const existingInvestor = breakdownByTier[tierName].investors.find((i: any) => i.name === investorName)
          
          if (existingInvestor) {
            existingInvestor.amount += tierDistribution.distributionAmount
          } else {
            breakdownByTier[tierName].investors.push({
              name: investorName,
              email: tierDistribution.user.email,
              amount: tierDistribution.distributionAmount
            })
          }
          
          investorBreakdown.push({
            tier: tierName,
            investor: investorName,
            email: tierDistribution.user.email,
            amount: tierDistribution.distributionAmount
          })
        }
      }
    }
    
    // Count unique investors (not individual distributions)
    const uniqueInvestors = new Set()
    for (const tier of waterfallDistribution.waterfallStructure.waterfallTiers) {
      for (const tierDistribution of tier.tierDistributions) {
        if (tierDistribution.user) {
          uniqueInvestors.add(tierDistribution.user.id)
        }
      }
    }

    // Look for any deal files on this property that appear to be tied to this distribution.
    // We tag refinance statements with "Distribution ID: {id}" in the description when uploading.
    let attachedFiles: Array<{
      id: string
      originalName: string
      createdAt: Date
      description: string | null
      propertyId: string
    }> = []

    if (waterfallDistribution.waterfallStructure.propertyId) {
      attachedFiles = await prisma.dealFile.findMany({
        where: {
          propertyId: waterfallDistribution.waterfallStructure.propertyId,
          description: {
            contains: distributionId,
          },
        },
        select: {
          id: true,
          originalName: true,
          createdAt: true,
          description: true,
          propertyId: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }
    
    return NextResponse.json({
      distribution: waterfallDistribution,
      detailedBreakdown: {
        byTier: breakdownByTier,
        entities: entityBreakdown,
        investors: investorBreakdown,
        summary: {
          totalDistributed: waterfallDistribution.totalAmount,
          totalEntities: entityBreakdown.length,
          totalInvestors: uniqueInvestors.size,
          tiersProcessed: Object.keys(breakdownByTier).length,
        },
      },
      attachedFiles,
    })
  } catch (error) {
    console.error('Error fetching distribution breakdown:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 