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

    // If refinance, compute distribution by subtracting old debt and fees from new debt
    let totalDistributionAmount = body.totalAmount
    let debtAmount = property.debtAmount || 0
    let isRefinancing = false

    if (body.distributionType === 'REFINANCE') {
      const newDebtAmount = parseFloat(body.newDebtAmount || '0') || 0
      const originationFees = parseFloat(body.originationFees || '0') || 0
      const prepaymentPenalty = parseFloat(body.prepaymentPenalty || '0') || 0
      const closingFeesList: Array<{ category: string; amount: number }> = Array.isArray(body.closingFeesItems) ? body.closingFeesItems.map((i: any) => ({ category: String(i.category || ''), amount: Number(i.amount || 0) })) : []
      const closingFees = closingFeesList.reduce((s, i) => s + (i.amount || 0), 0)

      // For refinance, the new debt amount becomes the current debt
      debtAmount = newDebtAmount
      isRefinancing = true
      
      // Calculate distribution amount: New Debt - Old Debt - Origination - Closing - Prepayment
      const oldDebtAmount = property.debtAmount || 0
      totalDistributionAmount = newDebtAmount - oldDebtAmount - originationFees - closingFees - prepaymentPenalty
      
      // Ensure distribution amount is not negative
      if (totalDistributionAmount < 0) {
        totalDistributionAmount = 0
      }
      
      // For refinance, we don't subtract debt again since it's already accounted for in the calculation
      // The distribution amount is what's available after paying off old debt and fees
    } else {
      // For non-refinance distributions, subtract debt as usual
      totalDistributionAmount = totalDistributionAmount - debtAmount
    }
    
    // STEP 1: Calculate available for distribution
    let availableForDistribution = totalDistributionAmount
    
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
            const tierDistribution = {
              waterfallTierId: tier.id,
              userId: userId,
              distributionAmount: investorShare,
              distributionDate: new Date(body.distributionDate),
              distributionType: body.distributionType,
              description: `${tier.tierName} - ${investor.user.firstName} ${investor.user.lastName}`
            }
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

    // STEP 6.1: Save all tier distributions to the database
    if (allTierDistributions.length > 0) {
      await prisma.waterfallTierDistribution.createMany({
        data: allTierDistributions
      })
      console.log(`Created ${allTierDistributions.length} tier distributions for waterfall distribution ${waterfallDistribution.id}`)
    }

    // If refinance with closing fee items, persist them
    if (body.distributionType === 'REFINANCE' && Array.isArray(body.closingFeesItems) && body.closingFeesItems.length > 0) {
      await prisma.refinanceClosingFee.createMany({
        data: body.closingFeesItems.map((i: any) => ({
          waterfallDistributionId: waterfallDistribution.id,
          category: String(i.category || ''),
          amount: Number(i.amount || 0)
        }))
      })
    }

    // STEP 6.5: Update property debt for refinancing distributions
    if (isRefinancing && body.newDebtAmount && property) {
      try {
        const newDebtDetails = body.newDebtDetails || 
          `Refinanced debt - ${body.newLender || 'New lender'} - ${body.newInterestRate ? body.newInterestRate + '%' : 'Rate TBD'} - ${body.newTerm ? body.newTerm + ' year term' : 'Term TBD'}`
        
        // Save old debt information in the distribution record for potential rollback
        const oldDebtInfo = {
          amount: property.debtAmount || 0,
          details: property.debtDetails || 'No previous debt details'
        }
        
        await prisma.property.update({
          where: { id: property.id },
          data: {
            debtAmount: parseFloat(body.newDebtAmount),
            debtDetails: newDebtDetails
          }
        })
        
        // Update the distribution record with old debt info for rollback capability
        await prisma.waterfallDistribution.update({
          where: { id: waterfallDistribution.id },
          data: {
            oldDebtAmount: oldDebtInfo.amount,
            oldDebtDetails: oldDebtInfo.details
          }
        })
      } catch (error) {
        // Don't fail the entire distribution if debt update fails
      }
    }

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
      },
      // Comprehensive calculation details for reference
      calculationDetails: {
        refinancing: isRefinancing ? {
          oldDebtAmount: property.debtAmount || 0,
          newDebtAmount: parseFloat(body.newDebtAmount || '0') || 0,
          originationFees: parseFloat(body.originationFees || '0') || 0,
          closingFees: Array.isArray(body.closingFeesItems) ? body.closingFeesItems.reduce((s: number, i: any) => s + (i.amount || 0), 0) : 0,
          closingFeesBreakdown: Array.isArray(body.closingFeesItems) ? body.closingFeesItems.map((i: any) => ({ category: String(i.category || ''), amount: Number(i.amount || 0) })) : [],
          prepaymentPenalty: parseFloat(body.prepaymentPenalty || '0') || 0,
          calculationFormula: `${body.newDebtAmount} - ${property.debtAmount || 0} - ${parseFloat(body.originationFees || '0') || 0} - ${Array.isArray(body.closingFeesItems) ? body.closingFeesItems.reduce((s: number, i: any) => s + (i.amount || 0), 0) : 0} - ${parseFloat(body.prepaymentPenalty || '0') || 0}`,
          calculatedDistribution: totalDistributionAmount,
          propertyDebtUpdated: isRefinancing ? parseFloat(body.newDebtAmount || '0') : property.debtAmount || 0
        } : null,
        waterfallStructure: {
          id: waterfallStructure.id,
          name: waterfallStructure.name,
          description: waterfallStructure.description,
          tiers: waterfallStructure.waterfallTiers.map(tier => ({
            id: tier.id,
            tierNumber: tier.tierNumber,
            tierName: tier.tierName,
            tierType: tier.tierType,
            priority: tier.priority,
            returnRate: tier.returnRate,
            catchUpPercentage: tier.catchUpPercentage,
            promotePercentage: tier.promotePercentage,
            isActive: tier.isActive
          }))
        },
        property: {
          id: property.id,
          name: property.name,
          address: property.address,
          oldDebtAmount: property.debtAmount || 0,
          newDebtAmount: isRefinancing ? parseFloat(body.newDebtAmount || '0') : property.debtAmount || 0,
          totalInvestedCapital: totalInvestedCapital,
          directInvestments: property.investments.length,
          entityInvestments: property.entityInvestments.length
        },
        debtDetails: {
          oldDebt: {
            amount: property.debtAmount || 0,
            details: property.debtDetails || 'No debt details available'
          },
          newDebt: isRefinancing ? {
            amount: parseFloat(body.newDebtAmount || '0'),
            details: body.newDebtDetails || 'New refinanced debt',
            lender: body.newLender || 'New lender',
            interestRate: body.newInterestRate || null,
            term: body.newTerm || null,
            amortization: body.newAmortization || null
          } : null,
          debtChange: isRefinancing ? {
            amountChange: parseFloat(body.newDebtAmount || '0') - (property.debtAmount || 0),
            percentageChange: property.debtAmount ? ((parseFloat(body.newDebtAmount || '0') - (property.debtAmount || 0)) / (property.debtAmount || 0)) * 100 : 0
          } : null,
          rollbackInfo: isRefinancing ? {
            canRollback: true,
            oldDebtAmount: property.debtAmount || 0,
            oldDebtDetails: property.debtDetails || 'No previous debt details',
            message: 'Old debt information saved for potential rollback if distribution is deleted'
          } : null
        },
        investors: Array.from(investorMap.entries()).map(([userId, investor]) => ({
          userId: userId,
          name: `${investor.user.firstName} ${investor.user.lastName}`,
          email: investor.user.email,
          totalOwnership: investor.totalOwnership,
          directInvestment: investor.directInvestment,
          entityInvestments: investor.entityInvestments,
          totalInvestment: investor.directInvestment + investor.entityInvestments.reduce((sum: number, e: any) => sum + e.investmentAmount, 0)
        })),
        previousDistributions: {
          count: previousDistributions.length,
          totalAmount: previousDistributions.reduce((sum, dist) => sum + dist.totalAmount, 0),
          distributions: previousDistributions.map(dist => ({
            id: dist.id,
            totalAmount: dist.totalAmount,
            distributionDate: dist.distributionDate,
            distributionType: dist.distributionType,
            description: dist.description
          }))
        },
        tierCalculations: distributionResults.map(result => ({
          tier: result.tier,
          amount: result.amount,
          type: result.type,
          investors: breakdownByTier[result.tier]?.investors || []
        }))
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
      // Get the distribution details first to check if we need to restore old debt
      const distribution = await tx.waterfallDistribution.findUnique({
        where: { id: distributionId },
        include: {
          waterfallStructure: {
            include: {
              property: true
            }
          }
        }
      })
      
      if (distribution) {
        // If this was a refinancing distribution, restore the old debt
        if (distribution.distributionType === 'REFINANCE' && 
            distribution.oldDebtAmount !== null && 
            distribution.waterfallStructure.property) {
          
          await tx.property.update({
            where: { id: distribution.waterfallStructure.property.id },
            data: {
              debtAmount: distribution.oldDebtAmount,
              debtDetails: distribution.oldDebtDetails || 'Restored from deleted refinancing distribution'
            }
          })
        }
        
        // Delete all tier distributions for this waterfall structure
        await tx.waterfallTierDistribution.deleteMany({
          where: {
            waterfallTier: {
              waterfallStructureId: distribution.waterfallStructureId
            }
          }
        })
        
        // Delete refinance closing fees
        await tx.refinanceClosingFee.deleteMany({
          where: {
            waterfallDistributionId: distributionId
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