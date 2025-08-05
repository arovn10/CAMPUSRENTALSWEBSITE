import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Fetching distributions for property:', propertyId)
    
    // Get all waterfall distributions for the property
    const distributions = await prisma.waterfallDistribution.findMany({
      where: {
        waterfallStructure: {
          propertyId: propertyId
        }
      },
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
    
    console.log('Found distributions:', distributions.length)
    console.log('Distribution details:', distributions.map((d: any) => ({
      id: d.id,
      totalAmount: d.totalAmount,
      distributionDate: d.distributionDate,
      structureName: d.waterfallStructure.name,
      structureId: d.waterfallStructure.id
    })))
    
    return NextResponse.json(distributions)
  } catch (error) {
    console.error('Error fetching waterfall distributions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to process distributions
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Get the waterfall structure with all tiers
    const waterfallStructure = await prisma.waterfallStructure.findUnique({
      where: { id: body.waterfallStructureId },
      include: {
        waterfallTiers: {
          where: { isActive: true },
          orderBy: { priority: 'asc' }
        },
        property: {
          include: {
            entityInvestments: {
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
            investments: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })
    
    if (!waterfallStructure) {
      return NextResponse.json(
        { error: 'Waterfall structure not found' },
        { status: 404 }
      )
    }

    let property
    
    // Handle global waterfall structures (no property associated)
    if (!waterfallStructure.property) {
      if (!body.propertyId) {
        return NextResponse.json(
          { error: 'Property ID is required for global waterfall structures' },
          { status: 400 }
        )
      }
      
      // Fetch the property separately for global structures
      property = await prisma.property.findUnique({
        where: { id: body.propertyId },
        include: {
          entityInvestments: {
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
          investments: {
            include: {
              user: true
            }
          }
        }
      })
      
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
    } else {
      property = waterfallStructure.property
    }

    const totalDistributionAmount = body.totalAmount
    
    // STEP 1: Subtract debt first
    const debtAmount = property.debtAmount || 0
    let availableForDistribution = totalDistributionAmount - debtAmount
    
    if (availableForDistribution < 0) {
      return NextResponse.json(
        { error: 'Distribution amount is less than outstanding debt. Cannot process distribution.' },
        { status: 400 }
      )
    }

    // STEP 2: Calculate total invested capital and ownership percentages
    // We'll calculate this after processing the investor map to avoid double-counting
    let totalInvestedCapital = 0

    // STEP 3: Create a map of all individual investors and their total ownership percentages
    const investorMap = new Map()

    console.log('Processing distribution for property:', {
      propertyId: property.id,
      propertyName: property.name,
      directInvestments: property.investments.length,
      entityInvestments: property.entityInvestments.length,
      totalInvestedCapital
    })

    // Add direct investors
    for (const investment of property.investments) {
      const key = investment.userId
      const existing = investorMap.get(key) || { 
        userId: key, 
        user: investment.user, 
        totalOwnership: 0, 
        directInvestment: 0,
        entityInvestments: []
      }
      existing.totalOwnership += (investment.ownershipPercentage || 0)
      existing.directInvestment += investment.investmentAmount
      investorMap.set(key, existing)
      console.log('Added direct investor:', { userId: key, userName: investment.user.firstName, ownership: existing.totalOwnership, investment: investment.investmentAmount })
    }

    // Add entity investors (but don't double count - only count individual ownership)
    for (const entityInvestment of property.entityInvestments) {
      console.log('Processing entity investment:', {
        entityId: entityInvestment.entityId,
        entityName: entityInvestment.entity.name,
        entityOwners: entityInvestment.entity.entityOwners.length
      })
      
      for (const owner of entityInvestment.entity.entityOwners) {
        const key = owner.userId
        const existing = investorMap.get(key) || { 
          userId: key, 
          user: owner.user, 
          totalOwnership: 0, 
          directInvestment: 0,
          entityInvestments: []
        }
        
        // Calculate individual's share of this entity's ownership
        const individualShareOfEntity = (owner.ownershipPercentage / 100) * entityInvestment.ownershipPercentage
        
        // Check if this investor already has direct investments for this property
        // If so, we should prioritize the entity investment and not double-count
        if (existing.directInvestment > 0) {
          console.log('Investor has both direct and entity investments - using entity investment only:', {
            userId: key,
            userName: owner.user.firstName,
            directInvestment: existing.directInvestment,
            entityShare: individualShareOfEntity
          })
          // Reset to entity ownership only to avoid double-counting
          existing.totalOwnership = individualShareOfEntity
          existing.directInvestment = 0
        } else {
          existing.totalOwnership += individualShareOfEntity
        }
        
        console.log('Entity ownership calculation:', {
          entityName: entityInvestment.entity.name,
          entityOwnership: entityInvestment.ownershipPercentage,
          ownerName: owner.user.firstName,
          ownerEntityPercentage: owner.ownershipPercentage,
          calculatedShare: individualShareOfEntity,
          totalOwnershipAfter: existing.totalOwnership
        })
        // Use the actual investment amount contributed by this individual to the entity
        // The owner.investmentAmount field tracks the actual capital contributed
        const actualContribution = owner.investmentAmount || 0
        
        console.log('Entity owner details:', {
          ownerName: owner.user.firstName + ' ' + owner.user.lastName,
          ownerId: owner.userId,
          ownershipPercentage: owner.ownershipPercentage,
          investmentAmount: owner.investmentAmount,
          actualContribution: actualContribution,
          entityName: entityInvestment.entity.name,
          entityTotalInvestment: entityInvestment.investmentAmount
        })
        
        existing.entityInvestments.push({
          entityName: entityInvestment.entity.name,
          entityOwnership: entityInvestment.ownershipPercentage,
          individualOwnership: owner.ownershipPercentage,
          investmentAmount: actualContribution
        })
        investorMap.set(key, existing)
        console.log('Added entity investor:', { 
          userId: key, 
          userName: owner.user.firstName, 
          ownership: existing.totalOwnership,
          entityShare: individualShareOfEntity,
          investment: entityInvestment.investmentAmount * (owner.ownershipPercentage / 100)
        })
      }
    }

    // Normalize ownership percentages to ensure they don't exceed 100%
    const totalOwnership = Array.from(investorMap.values()).reduce((sum, investor) => sum + investor.totalOwnership, 0)
    console.log('Total ownership before normalization:', totalOwnership)
    
    if (totalOwnership > 100) {
      console.log('Normalizing ownership percentages...')
      for (const [userId, investor] of Array.from(investorMap.entries())) {
        investor.totalOwnership = (investor.totalOwnership / totalOwnership) * 100
        console.log(`Normalized ${investor.user.firstName}: ${investor.totalOwnership}%`)
      }
    }

    // Calculate total invested capital based on processed investor map (avoiding double-counting)
    totalInvestedCapital = Array.from(investorMap.values()).reduce((sum: number, investor: any) => {
      const directInvestment = investor.directInvestment || 0
      const entityInvestment = investor.entityInvestments.reduce((eSum: number, e: any) => eSum + e.investmentAmount, 0)
      return sum + directInvestment + entityInvestment
    }, 0)
    
    console.log('Total invested capital (after processing):', totalInvestedCapital)
    
    // Debug: Log the final investor map
    console.log('Final investor map:')
    for (const [userId, investor] of Array.from(investorMap.entries())) {
      const directInvestment = investor.directInvestment || 0
      const entityInvestment = investor.entityInvestments.reduce((sum: number, e: any) => sum + e.investmentAmount, 0)
      const totalInvestment = directInvestment + entityInvestment
      
      console.log(`- ${investor.user.firstName} ${investor.user.lastName}:`, {
        directInvestment,
        entityInvestments: investor.entityInvestments,
        totalEntityInvestment: entityInvestment,
        totalInvestment,
        ownership: investor.totalOwnership
      })
    }
    
    // Get previous distributions for this waterfall structure to calculate cumulative payouts
    const previousDistributions = await prisma.waterfallDistribution.findMany({
      where: {
        waterfallStructureId: waterfallStructure.id,
        distributionDate: { lt: new Date(body.distributionDate) }
      },
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
      orderBy: { distributionDate: 'asc' }
    })
    
    console.log('Previous distributions found:', previousDistributions.length)
    
    // Calculate cumulative payouts per investor
    const cumulativePayouts = new Map()
    
    for (const distribution of previousDistributions) {
      for (const tier of distribution.waterfallStructure.waterfallTiers) {
        for (const tierDistribution of tier.tierDistributions) {
          const userId = tierDistribution.userId
          const currentPayout = cumulativePayouts.get(userId) || 0
          cumulativePayouts.set(userId, currentPayout + tierDistribution.distributionAmount)
        }
      }
    }
    
    console.log('Cumulative payouts calculated for', cumulativePayouts.size, 'investors')
    
    console.log('Total investors found:', investorMap.size)
    if (investorMap.size === 0) {
      return NextResponse.json(
        { error: 'No investors found for this property. Please ensure there are investors associated with the property before processing distributions.' },
        { status: 400 }
      )
    }

    let remainingAmount = availableForDistribution
    const distributionResults = []
    const allTierDistributions = []

    // STEP 4: Process each tier in priority order
    for (const tier of waterfallStructure.waterfallTiers) {
      if (remainingAmount <= 0) break
      
      let tierAmount = 0
      
      switch (tier.tierType) {
        case 'PREFERRED_RETURN':
          // Calculate preferred return based on return rate and invested capital
          const preferredReturnAmount = totalInvestedCapital * (tier.returnRate || 0) / 100
          tierAmount = Math.min(remainingAmount, preferredReturnAmount)
          break
          
        case 'CATCH_UP':
          // Catch-up tier - distribute based on catch-up percentage
          if (tier.catchUpPercentage) {
            tierAmount = Math.min(remainingAmount, availableForDistribution * tier.catchUpPercentage / 100)
          }
          break
          
        case 'PROMOTE':
          // Promote tier - distribute based on promote percentage
          if (tier.promotePercentage) {
            tierAmount = Math.min(remainingAmount, availableForDistribution * tier.promotePercentage / 100)
          }
          break
          
        case 'RESIDUAL':
          // Residual tier - distribute remaining amount based on ownership percentages
          tierAmount = remainingAmount
          break
          
        case 'RETURN_OF_CAPITAL':
          // Return of capital - distribute based on invested amounts, not ownership percentages
          tierAmount = Math.min(remainingAmount, totalInvestedCapital)
          break
      }
      
      if (tierAmount > 0) {
        // STEP 5: Distribute tier amount to individual investors only
        const tierDistributions = []
        
        for (const [userId, investor] of Array.from(investorMap.entries())) {
          let investorShare = 0
          
          if (tier.tierType === 'RETURN_OF_CAPITAL') {
            // For ROC, distribute based on actual invested amounts, considering previous payouts
            const investorTotalInvestment = investor.directInvestment + investor.entityInvestments.reduce((sum: number, e: any) => sum + e.investmentAmount, 0)
            const previousPayouts = cumulativePayouts.get(userId) || 0
            const remainingInvestment = Math.max(0, investorTotalInvestment - previousPayouts)
            
            // Calculate total remaining investment across all investors
            const totalRemainingInvestment = Array.from(investorMap.values()).reduce((sum: number, inv: any) => {
              const invTotalInvestment = inv.directInvestment + inv.entityInvestments.reduce((eSum: number, e: any) => eSum + e.investmentAmount, 0)
              const invPreviousPayouts = cumulativePayouts.get(inv.userId) || 0
              return sum + Math.max(0, invTotalInvestment - invPreviousPayouts)
            }, 0)
            
            investorShare = totalRemainingInvestment > 0 ? (remainingInvestment / totalRemainingInvestment) * tierAmount : 0
            
                    console.log('ROC calculation for', investor.user.firstName, ':', {
          tierAmount,
          totalInvestedCapital,
          investorTotalInvestment,
          previousPayouts,
          remainingInvestment,
          totalRemainingInvestment,
          investorShare,
          directInvestment: investor.directInvestment,
          entityInvestments: investor.entityInvestments,
          // Add detailed breakdown of entity investments
          entityBreakdown: investor.entityInvestments.map((e: any) => ({
            entityName: e.entityName,
            investmentAmount: e.investmentAmount,
            individualOwnership: e.individualOwnership
          }))
        })
          } else {
            // For all other tiers, distribute based on ownership percentages
            investorShare = (investor.totalOwnership / 100) * tierAmount
          }
          
          if (investorShare > 0) {
            const tierDistribution = await prisma.waterfallTierDistribution.create({
              data: {
                waterfallTierId: tier.id,
                userId: userId,
                distributionAmount: investorShare,
                distributionDate: new Date(body.distributionDate),
                distributionType: body.distributionType,
                description: `${tier.tierName} - ${investor.user.firstName} ${investor.user.lastName}`
              }
            })
            tierDistributions.push(tierDistribution)
          }
        }
        
        allTierDistributions.push(...tierDistributions)
        remainingAmount -= tierAmount
        distributionResults.push({
          tier: tier.tierName,
          amount: tierAmount,
          type: tier.tierType
        })
      }
    }
    
    // STEP 6: Create the main waterfall distribution record
    const waterfallDistribution = await prisma.waterfallDistribution.create({
      data: {
        waterfallStructureId: waterfallStructure.id,
        totalAmount: totalDistributionAmount,
        distributionDate: new Date(body.distributionDate),
        distributionType: body.distributionType,
        description: body.description,
        isProcessed: true
      }
    })

    // STEP 7: Get detailed breakdown for response
    const detailedBreakdown = await prisma.waterfallTierDistribution.findMany({
      where: {
        waterfallTier: {
          waterfallStructureId: waterfallStructure.id
        },
        distributionDate: new Date(body.distributionDate)
      },
      include: {
        waterfallTier: true,
        user: true
      },
      orderBy: [
        { waterfallTier: { priority: 'asc' } },
        { distributionAmount: 'desc' }
      ]
    })

    // STEP 8: Group breakdown by tier and investor
    const breakdownByTier: { [key: string]: any } = {}
    const investorBreakdown: any[] = []

    for (const distribution of detailedBreakdown) {
      const tierName = distribution.waterfallTier.tierName
      if (!distribution.user) continue // Skip if no user
      const investorName = `${distribution.user.firstName} ${distribution.user.lastName}`
      
      if (!breakdownByTier[tierName]) {
        breakdownByTier[tierName] = {
          tierType: distribution.waterfallTier.tierType,
          totalAmount: 0,
          investors: []
        }
      }
      
      breakdownByTier[tierName].totalAmount += distribution.distributionAmount

      // Find existing investor in this tier
      const existingInvestor = breakdownByTier[tierName].investors.find((i: any) => i.name === investorName)
      
      if (existingInvestor) {
        existingInvestor.amount += distribution.distributionAmount
      } else {
        // Get investor details from our map
        const investorDetails = investorMap.get(distribution.userId)
        breakdownByTier[tierName].investors.push({
          name: investorName,
          email: distribution.user.email,
          amount: distribution.distributionAmount,
          totalOwnership: investorDetails?.totalOwnership || 0,
          entityInvestments: investorDetails?.entityInvestments || [],
          directInvestment: investorDetails?.directInvestment || 0
        })
      }
      
      investorBreakdown.push({
        tier: tierName,
        investor: investorName,
        email: distribution.user.email,
        amount: distribution.distributionAmount,
        totalOwnership: investorMap.get(distribution.userId)?.totalOwnership || 0
      })
    }
    
    return NextResponse.json({
      waterfallDistribution,
      distributionResults,
      remainingAmount,
      debtSubtracted: debtAmount,
      availableAfterDebt: availableForDistribution,
      detailedBreakdown: {
        byTier: breakdownByTier,
        investors: investorBreakdown,
        summary: {
          totalDistributed: availableForDistribution - remainingAmount,
          totalInvestors: investorBreakdown.length,
          tiersProcessed: Object.keys(breakdownByTier).length,
          debtAmount: debtAmount,
          originalAmount: totalDistributionAmount
        }
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error processing waterfall distribution:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code || 'No code'
    })
    return NextResponse.json(
      { error: 'Failed to process distribution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { distributionId, totalAmount, distributionDate, distributionType, description } = body
    
    // Update the waterfall distribution
    const updatedDistribution = await prisma.waterfallDistribution.update({
      where: { id: distributionId },
      data: {
        totalAmount: parseFloat(totalAmount),
        distributionDate: new Date(distributionDate),
        distributionType,
        description: description || null
      }
    })
    
    return NextResponse.json({
      message: 'Distribution updated successfully',
      distribution: updatedDistribution
    })
  } catch (error) {
    console.error('Error updating waterfall distribution:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
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
    
    // Delete the waterfall distribution and all related tier distributions
    await prisma.$transaction(async (tx) => {
      // Get the waterfall structure ID first
      const distribution = await tx.waterfallDistribution.findUnique({
        where: { id: distributionId },
        select: { waterfallStructureId: true }
      })
      
      if (distribution) {
        // Delete all tier distributions for this waterfall structure
        await tx.waterfallTierDistribution.deleteMany({
          where: {
            waterfallTier: {
              waterfallStructureId: distribution.waterfallStructureId
            }
          }
        })
      }
      
      // Delete the main distribution
      await tx.waterfallDistribution.delete({
        where: { id: distributionId }
      })
    })
    
    return NextResponse.json({
      message: 'Distribution deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting waterfall distribution:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 