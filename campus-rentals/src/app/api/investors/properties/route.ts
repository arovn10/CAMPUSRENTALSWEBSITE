import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Robust role-aware logging: who is calling and with what headers/context
    try {
      const hdrAuth = request.headers.get('authorization') || 'none'
      console.log('[INVESTORS/PROPERTIES] Request start', JSON.stringify({
        role: user.role,
        userId: user.id,
        email: (user as any).email || null,
        hasAuthHeader: !!hdrAuth,
        path: '/api/investors/properties'
      }))
    } catch {}

    // Get investments based on user role
    let investments
    let entityInvestments
    if (user.role === 'ADMIN') {
      // Admin can see ALL investments
      investments = await prisma.investment.findMany({
        include: { 
          property: true,
          distributions: true,
          user: true // Include user info for admin view
        }
      })
      
      // Also fetch entity investments for admin
      entityInvestments = await prisma.entityInvestment.findMany({
        include: { 
          property: true,
          entityDistributions: true,
          entity: {
            include: {
              entityOwners: {
                include: {
                  user: true,
                  investorEntity: true
                }
              }
            }
          },
          entityInvestmentOwners: { include: { user: true, investorEntity: true } }
        }
      })
      // Admin-side logging of counts and quick aggregates
      try {
        const totalInv = investments.reduce((s: number, i: any) => s + (i.investmentAmount || 0), 0)
        console.log('[INVESTORS/PROPERTIES][ADMIN] Base investments', JSON.stringify({
          count: investments.length,
          sumInvestmentAmount: totalInv
        }))
      } catch {}
    } else {
      // Investors only see their own investments
      // AND only for properties that have published deals
      investments = await prisma.investment.findMany({
        where: { userId: user.id },
        include: { 
          property: true,
          distributions: true
        }
      })
      
      // Filter investments to only show those with published deals
      try {
        // Check if published column exists
        const hasPublishedResult = await query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'deals' 
            AND column_name = 'published'
          ) as exists
        `)
        
        const hasPublished = Array.isArray(hasPublishedResult) && hasPublishedResult.length > 0 && hasPublishedResult[0].exists
        
        if (hasPublished) {
          // Get property IDs that have published deals
          const publishedDeals = await query<{ propertyId: string }>(`
            SELECT DISTINCT "propertyId" 
            FROM deals 
            WHERE published = true AND "propertyId" IS NOT NULL
          `)
          
          const publishedPropertyIds = new Set(publishedDeals.map(d => d.propertyId))
          
          // Filter investments to only those with published deals
          investments = investments.filter((inv: any) => 
            inv.propertyId && publishedPropertyIds.has(inv.propertyId)
          )
          
          console.log(`[INVESTORS/PROPERTIES] Filtered to ${investments.length} investments with published deals`)
        }
      } catch (error: any) {
        console.error('[INVESTORS/PROPERTIES] Error filtering by published deals:', error?.message)
        // Continue with all investments if filtering fails
      }
      try {
        const totalInv = investments.reduce((s: number, i: any) => s + (i.investmentAmount || 0), 0)
        console.log('[INVESTORS/PROPERTIES][INVESTOR] Direct investments', JSON.stringify({
          count: investments.length,
          sumInvestmentAmount: totalInv,
          details: investments.map((i: any) => ({
            property: i.property?.name || 'Unknown',
            investmentAmount: i.investmentAmount,
            propertyId: i.propertyId
          }))
        }))
      } catch {}
      // For investors, get entity investments where they are owners
      // Check both entity-level owners (entity.entityOwners) AND per-deal owners (entityInvestmentOwners)
      entityInvestments = await prisma.entityInvestment.findMany({
        include: { 
          property: true,
          entityDistributions: true,
          entity: {
            include: {
              entityOwners: {
                include: {
                  user: true
                }
              }
            }
          },
          entityInvestmentOwners: { include: { user: true, investorEntity: true } }
        },
        where: {
          OR: [
            {
              // User is in entity-level owners
              entity: {
                entityOwners: {
                  some: {
                    userId: user.id
                  }
                }
              }
            },
            {
              // User is in per-deal owners (entityInvestmentOwners)
              entityInvestmentOwners: {
                some: {
                  userId: user.id
                }
              }
            }
          ]
        }
      })
      
      // Filter entity investments to only show those with published deals
      try {
        const hasPublishedResult2 = await query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'deals' 
            AND column_name = 'published'
          ) as exists
        `)
        
        const hasPublished2 = Array.isArray(hasPublishedResult2) && hasPublishedResult2.length > 0 && hasPublishedResult2[0].exists
        
        if (hasPublished2) {
          const publishedDeals = await query<{ propertyId: string }>(`
            SELECT DISTINCT "propertyId" 
            FROM deals 
            WHERE published = true AND "propertyId" IS NOT NULL
          `)
          
          const publishedPropertyIds = new Set(publishedDeals.map((d: any) => d.propertyId))
          
          entityInvestments = entityInvestments.filter((ei: any) => 
            ei.propertyId && publishedPropertyIds.has(ei.propertyId)
          )
          
          console.log(`[INVESTORS/PROPERTIES] Filtered to ${entityInvestments.length} entity investments with published deals`)
        }
      } catch (error: any) {
        console.error('[INVESTORS/PROPERTIES] Error filtering entity investments by published deals:', error?.message)
        // Continue with all entity investments if filtering fails
      }

      try {
        const ownersCount = entityInvestments.reduce((s: number, ei: any) => s + ((ei.entityInvestmentOwners?.length || ei.entity?.entityOwners?.length || 0)), 0)
        const sumOwnerInv = entityInvestments.reduce((sum: number, ei: any) => {
          const owners = (ei.entityInvestmentOwners && ei.entityInvestmentOwners.length > 0) ? ei.entityInvestmentOwners : (ei.entity?.entityOwners || [])
          return sum + owners.reduce((s: number, o: any) => s + (parseFloat(o.investmentAmount || 0)), 0)
        }, 0)
        console.log('[INVESTORS/PROPERTIES][INVESTOR] Entity investments', JSON.stringify({
          count: entityInvestments.length,
          ownersCount,
          sumOwnersInvestmentAmount: sumOwnerInv
        }))
      } catch {}

      // Include additional properties explicitly granted via access table
      const explicitAccess = await (prisma as any).userPropertyAccess.findMany({ where: { userId: user.id } })
      if (explicitAccess.length > 0) {
        const extraPropertyIds = explicitAccess.map((a: any) => a.propertyId)
        const extraInvestments = await prisma.investment.findMany({
          where: { propertyId: { in: extraPropertyIds } },
          include: { property: true, distributions: true, user: true }
        })
        investments = investments.concat(extraInvestments)

        const extraEntityInvestments = await prisma.entityInvestment.findMany({
          where: { propertyId: { in: extraPropertyIds } },
          include: { property: true, entityDistributions: true, entity: { include: { entityOwners: { include: { user: true } } } }, entityInvestmentOwners: { include: { user: true, investorEntity: true } } }
        })
        entityInvestments = entityInvestments.concat(extraEntityInvestments)
      }
    }

    // Transform the regular investments data
    const formattedInvestments = investments.map((investment: any) => {
      const totalDistributions = investment.distributions.reduce((sum: number, dist: any) => sum + dist.amount, 0)
      const currentValue = investment.property.currentValue || investment.investmentAmount
      const totalReturn = currentValue - investment.investmentAmount + totalDistributions
      const irr = investment.investmentAmount > 0 ? ((currentValue / investment.investmentAmount - 1) * 100) : 0

      return {
        id: investment.id,
        propertyId: investment.propertyId,
        propertyName: investment.property.name,
        propertyAddress: investment.property.address,
        investmentAmount: investment.investmentAmount,
        currentValue: currentValue,
        totalReturn: totalReturn,
        irr: Math.round(irr * 100) / 100,
        ownershipPercentage: investment.ownershipPercentage || 100,
        status: investment.status,
        investmentDate: investment.investmentDate.toISOString(),
        // Expose deal/funding status at top-level for UI badges
        dealStatus: (investment.property as any).dealStatus || 'STABILIZED',
        fundingStatus: (investment.property as any).fundingStatus || 'FUNDED',
        // Include investor info for admin view
        investorName: user.role === 'ADMIN' && 'user' in investment ? `${(investment as any).user.firstName} ${(investment as any).user.lastName}` : null,
        investorEmail: user.role === 'ADMIN' && 'user' in investment ? (investment as any).user.email : null,
        distributions: investment.distributions.map((dist: any) => ({
          id: dist.id,
          amount: dist.amount,
          distributionDate: dist.distributionDate.toISOString(),
          distributionType: dist.distributionType,
          description: `${dist.distributionType} distribution`
        })),
        property: {
          id: investment.property.id,
          name: investment.property.name,
          address: investment.property.address,
          description: investment.property.description || '',
          bedrooms: investment.property.bedrooms,
          bathrooms: investment.property.bathrooms,
          price: investment.property.price,
          squareFeet: investment.property.squareFeet || 0,
          propertyType: investment.property.propertyType,
          acquisitionDate: investment.property.acquisitionDate?.toISOString() || null,
          acquisitionPrice: investment.property.acquisitionPrice || 0,
          constructionCost: investment.property.constructionCost || 0,
          totalCost: investment.property.totalCost || 0,
          debtAmount: investment.property.debtAmount || 0,
          debtDetails: investment.property.debtDetails || '',
          currentValue: investment.property.currentValue || 0,
          occupancyRate: investment.property.occupancyRate || 0,
          monthlyRent: investment.property.monthlyRent || 0,
          otherIncome: investment.property.otherIncome || 0,
          annualExpenses: investment.property.annualExpenses || 0,
          capRate: investment.property.capRate || 0,
          dealStatus: (investment.property as any).dealStatus || 'STABILIZED',
          fundingStatus: (investment.property as any).fundingStatus || 'FUNDED',
        },
        investmentType: 'DIRECT' // Mark as direct investment
      }
    })

    // Transform the entity investments data
    const formattedEntityInvestments = entityInvestments.map((entityInvestment: any) => {
      const propertyName = entityInvestment.property?.name || 'Unknown'
      const isFreretSt = propertyName.toLowerCase().includes('freret')
      
      // Calculate total investment from individual entity owners (prefer per-deal owners)
      const hasPerDealOwners = entityInvestment.entityInvestmentOwners && Array.isArray(entityInvestment.entityInvestmentOwners) && entityInvestment.entityInvestmentOwners.length > 0
      const owners = hasPerDealOwners 
        ? entityInvestment.entityInvestmentOwners 
        : (entityInvestment.entity?.entityOwners || [])
      
      // VERBOSE LOGGING FOR FRERET ST
      if (isFreretSt && user.role === 'INVESTOR') {
        try {
          console.log('[FRERET DEBUG] Processing entity investment', JSON.stringify({
            property: propertyName,
            entityName: entityInvestment.entity?.name,
            hasPerDealOwners,
            ownersCount: owners.length,
            owners: owners.map((o: any) => ({
              id: o.id,
              userId: o.userId,
              investorEntityId: o.investorEntityId,
              investorEntityName: o.investorEntity?.name,
              userName: o.userName || (o.user ? `${o.user.firstName} ${o.user.lastName}` : null),
              investmentAmount: o.investmentAmount,
              hasBreakdown: Array.isArray(o.breakdown),
              breakdownLength: o.breakdown ? o.breakdown.length : 0,
              breakdown: o.breakdown || null
            }))
          }))
        } catch {}
      }
      
      // For investors: show only their individual amount, not the entity total
      // For admins: show the sum of all owners (entity total)
      let finalInvestmentAmount = entityInvestment.investmentAmount || 0
      if (owners.length > 0) {
        if (user.role === 'INVESTOR') {
          // Find this investor's individual amount
          const investorId = user.id
          const investorEmail = (user as any).email || ''
          const investorName = `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim().toLowerCase()
          
          // VERBOSE LOGGING FOR FRERET ST
          if (isFreretSt) {
            try {
              console.log('[FRERET DEBUG] Investor search params', JSON.stringify({
                property: propertyName,
                investorId,
                investorEmail,
                investorName
              }))
            } catch {}
          }
          
          // First, check for direct owner match (user directly owns share in entity)
          const matchingOwner = owners.find((owner: any) => {
            const ownerId = owner.userId || owner.user?.id || null
            const ownerEmail = (owner.userEmail || owner.user?.email || '').trim().toLowerCase()
            const ownerName = (owner.userName || '').trim().toLowerCase()
            
            return (
              (ownerId && investorId && String(ownerId) === String(investorId)) ||
              (!!ownerEmail && !!investorEmail && ownerEmail === investorEmail.trim().toLowerCase()) ||
              (!!ownerName && !!investorName && ownerName === investorName)
            )
          })
          
          // VERBOSE LOGGING FOR FRERET ST
          if (isFreretSt) {
            try {
              console.log('[FRERET DEBUG] Direct owner match result', JSON.stringify({
                property: propertyName,
                foundDirectMatch: !!matchingOwner,
                matchingOwner: matchingOwner ? {
                  id: matchingOwner.id,
                  userId: matchingOwner.userId,
                  userName: matchingOwner.userName,
                  investmentAmount: matchingOwner.investmentAmount
                } : null
              }))
            } catch {}
          }
          
          if (matchingOwner) {
            // Direct owner match found
            finalInvestmentAmount = parseFloat(matchingOwner.investmentAmount || 0)
            
            // VERBOSE LOGGING FOR FRERET ST
            if (isFreretSt) {
              try {
                console.log('[FRERET DEBUG] Using direct owner amount', JSON.stringify({
                  property: propertyName,
                  finalInvestmentAmount
                }))
              } catch {}
            }
          } else {
            // Check if investor is nested inside an entity owner (e.g., Campus Rentals LLC inside Campus Rentals 2 LLC)
            // Look for owners that are entities (have investorEntityId) with a breakdown array
            const entityOwnerWithBreakdown = owners.find((owner: any) => {
              // Owner must be an entity (has investorEntityId) and have a breakdown array
              const isEntityOwner = !!owner.investorEntityId
              const hasBreakdown = Array.isArray(owner.breakdown) && owner.breakdown.length > 0
              return isEntityOwner && hasBreakdown
            })
            
            // VERBOSE LOGGING FOR FRERET ST
            if (isFreretSt) {
              try {
                console.log('[FRERET DEBUG] Entity owner with breakdown search', JSON.stringify({
                  property: propertyName,
                  foundEntityOwnerWithBreakdown: !!entityOwnerWithBreakdown,
                  entityOwnerWithBreakdown: entityOwnerWithBreakdown ? {
                    id: entityOwnerWithBreakdown.id,
                    investorEntityId: entityOwnerWithBreakdown.investorEntityId,
                    investorEntityName: entityOwnerWithBreakdown.investorEntity?.name,
                    investmentAmount: entityOwnerWithBreakdown.investmentAmount,
                    breakdown: entityOwnerWithBreakdown.breakdown
                  } : null
                }))
              } catch {}
            }
            
            if (entityOwnerWithBreakdown && Array.isArray(entityOwnerWithBreakdown.breakdown)) {
              // Search the breakdown array for the investor
              const breakdownMatch = entityOwnerWithBreakdown.breakdown.find((item: any) => {
                const itemId = item.id || null
                const itemLabel = (item.label || '').trim().toLowerCase()
                
                return (
                  (itemId && investorId && String(itemId) === String(investorId)) ||
                  (!!itemLabel && !!investorName && itemLabel === investorName)
                )
              })
              
              // VERBOSE LOGGING FOR FRERET ST
              if (isFreretSt) {
                try {
                  console.log('[FRERET DEBUG] Breakdown search', JSON.stringify({
                    property: propertyName,
                    breakdownArray: entityOwnerWithBreakdown.breakdown,
                    searchingFor: { investorId, investorName },
                    foundBreakdownMatch: !!breakdownMatch,
                    breakdownMatch: breakdownMatch || null
                  }))
                } catch {}
              }
              
              if (breakdownMatch && breakdownMatch.amount) {
                // Found investor in nested entity breakdown
                finalInvestmentAmount = parseFloat(breakdownMatch.amount || 0)
                
                // VERBOSE LOGGING FOR FRERET ST
                if (isFreretSt) {
                  try {
                    console.log('[FRERET DEBUG] Using breakdown amount', JSON.stringify({
                      property: propertyName,
                      finalInvestmentAmount
                    }))
                  } catch {}
                }
              } else {
                // No match in breakdown - set to 0
                finalInvestmentAmount = 0
                
                // VERBOSE LOGGING FOR FRERET ST
                if (isFreretSt) {
                  try {
                    console.log('[FRERET DEBUG] No breakdown match - setting to 0', JSON.stringify({
                      property: propertyName,
                      breakdownArray: entityOwnerWithBreakdown.breakdown,
                      searchingFor: { investorId, investorName }
                    }))
                  } catch {}
                }
              }
            } else {
              // No matching owner found - set to 0 for this investor
              finalInvestmentAmount = 0
              
              // VERBOSE LOGGING FOR FRERET ST
              if (isFreretSt) {
                try {
                  console.log('[FRERET DEBUG] No entity owner with breakdown found - setting to 0', JSON.stringify({
                    property: propertyName,
                    ownersChecked: owners.map((o: any) => ({
                      hasInvestorEntityId: !!o.investorEntityId,
                      hasBreakdown: Array.isArray(o.breakdown),
                      breakdownLength: o.breakdown ? o.breakdown.length : 0
                    }))
                  }))
                } catch {}
              }
            }
          }
        } else {
          // Admin: sum all owners
          const calculatedInvestmentAmount = owners.reduce((sum: number, owner: any) => {
            const ownerAmount = parseFloat(owner.investmentAmount || 0)
            return sum + ownerAmount
          }, 0)
          finalInvestmentAmount = calculatedInvestmentAmount
        }
      }

      const totalDistributions = entityInvestment.entityDistributions.reduce((sum: number, dist: any) => sum + dist.amount, 0)
      const currentValue = entityInvestment.property.currentValue || finalInvestmentAmount
      const totalReturn = currentValue - finalInvestmentAmount + totalDistributions
      const irr = finalInvestmentAmount > 0 ? ((currentValue / finalInvestmentAmount - 1) * 100) : 0

      // For entity investments, show the entity itself as the investor on dashboards
      const investorName = entityInvestment.entity?.name || 'Entity Investor'
      const investorEmail = entityInvestment.entity?.contactEmail || ''

      const result = {
        id: entityInvestment.id,
        propertyId: entityInvestment.propertyId,
        propertyName: entityInvestment.property.name,
        propertyAddress: entityInvestment.property.address,
        investmentAmount: finalInvestmentAmount,
        currentValue: currentValue,
        totalReturn: totalReturn,
        irr: Math.round(irr * 100) / 100,
        ownershipPercentage: entityInvestment.ownershipPercentage || 100,
        status: entityInvestment.status,
        investmentDate: entityInvestment.investmentDate.toISOString(),
        // Expose deal/funding status at top-level for UI badges
        dealStatus: (entityInvestment.property as any).dealStatus || 'STABILIZED',
        fundingStatus: (entityInvestment.property as any).fundingStatus || 'FUNDED',
        // Include investor info (entity) for admin view
        investorName: user.role === 'ADMIN' ? investorName : null,
        investorEmail: user.role === 'ADMIN' ? investorEmail : null,
        distributions: entityInvestment.entityDistributions.map((dist: any) => ({
          id: dist.id,
          amount: dist.amount,
          distributionDate: dist.distributionDate.toISOString(),
          distributionType: dist.distributionType,
          description: `${dist.distributionType} distribution`
        })),
        property: {
          id: entityInvestment.property.id,
          name: entityInvestment.property.name,
          address: entityInvestment.property.address,
          description: entityInvestment.property.description || '',
          bedrooms: entityInvestment.property.bedrooms,
          bathrooms: entityInvestment.property.bathrooms,
          price: entityInvestment.property.price,
          squareFeet: entityInvestment.property.squareFeet || 0,
          propertyType: entityInvestment.property.propertyType,
          acquisitionDate: entityInvestment.property.acquisitionDate?.toISOString() || null,
          acquisitionPrice: entityInvestment.property.acquisitionPrice || 0,
          constructionCost: entityInvestment.property.constructionCost || 0,
          totalCost: entityInvestment.property.totalCost || 0,
          debtAmount: entityInvestment.property.debtAmount || 0,
          debtDetails: entityInvestment.property.debtDetails || '',
          currentValue: entityInvestment.property.currentValue || 0,
          occupancyRate: entityInvestment.property.occupancyRate || 0,
          monthlyRent: entityInvestment.property.monthlyRent || 0,
          otherIncome: entityInvestment.property.otherIncome || 0,
          annualExpenses: entityInvestment.property.annualExpenses || 0,
          capRate: entityInvestment.property.capRate || 0,
          dealStatus: (entityInvestment.property as any).dealStatus || 'STABILIZED',
          fundingStatus: (entityInvestment.property as any).fundingStatus || 'FUNDED',
        },
        investmentType: 'ENTITY', // Mark as entity investment
        entityName: entityInvestment.entity.name,
        entityType: entityInvestment.entity.type,
        entityOwners: owners.map((owner: any) => ({
          id: owner.id,
          userId: owner.userId || null,
          userName: owner.user ? `${owner.user.firstName} ${owner.user.lastName}` : (owner.investorEntity ? owner.investorEntity.name : 'Unknown Investor'),
          userEmail: owner.user ? owner.user.email : null,
          investorEntityId: owner.investorEntityId || null,
          investorEntityName: owner.investorEntity ? owner.investorEntity.name : null,
          ownershipPercentage: owner.ownershipPercentage,
          investmentAmount: owner.investmentAmount,
          breakdown: owner.breakdown || null // Include breakdown array for nested entity investments
        }))
      }

      try {
        // Log per-entity breakdown for visibility
        console.log('[INVESTORS/PROPERTIES] Entity investment transformed', JSON.stringify({
          role: user.role,
          property: (result as any).propertyName,
          entityName: (result as any).entityName,
          finalInvestmentAmount,
          owners: (result as any).entityOwners?.map((o: any) => ({ name: o.userName, amount: o.investmentAmount, pct: o.ownershipPercentage }))
        }))
      } catch {}
      
      // VERBOSE LOGGING FOR FRERET ST - Final result
      if (isFreretSt && user.role === 'INVESTOR') {
        try {
          console.log('[FRERET DEBUG] Final result', JSON.stringify({
            property: (result as any).propertyName,
            finalInvestmentAmount: (result as any).investmentAmount,
            entityOwners: (result as any).entityOwners?.map((o: any) => ({
              userName: o.userName,
              investorEntityId: o.investorEntityId,
              investorEntityName: o.investorEntityName,
              investmentAmount: o.investmentAmount,
              hasBreakdown: !!o.breakdown,
              breakdown: o.breakdown
            }))
          }))
        } catch {}
      }

      return result
    })

    // Group investments by property ID to prevent duplicate property cards
    // Multiple entity investments for same property should show as ONE property with nested ownership
    const investmentsByPropertyId = new Map<string, any>()
    
    // Log what we have before filtering (for debugging)
    try {
      console.log('[INVESTORS/PROPERTIES] Before filtering', JSON.stringify({
        role: user.role,
        directInvestmentsCount: formattedInvestments.length,
        directInvestmentsSample: formattedInvestments.slice(0, 3).map((di: any) => ({
          property: di.propertyName,
          propertyId: di.propertyId,
          amount: di.investmentAmount,
          type: di.investmentType || 'DIRECT'
        })),
        entityInvestmentsCount: formattedEntityInvestments.length,
        entityInvestmentsSample: formattedEntityInvestments.slice(0, 3).map((ei: any) => ({
          property: ei.propertyName,
          propertyId: ei.propertyId,
          amount: ei.investmentAmount,
          type: ei.investmentType || 'ENTITY',
          entityName: ei.entityName,
          hasOwners: (ei.entityOwners || []).length > 0
        }))
      }))
    } catch {}
    
    // For investors: filter out direct investments that have corresponding entity investments
    // (This prevents duplicate/correct data from inflating totals)
    let filteredDirectInvestments = formattedInvestments
    if (user.role === 'INVESTOR' && formattedEntityInvestments.length > 0) {
      const entityPropertyIds = new Set(formattedEntityInvestments.map((ei: any) => String(ei.propertyId)))
      const originalCount = filteredDirectInvestments.length
      
      // Log entity property IDs for debugging
      try {
        console.log('[INVESTORS/PROPERTIES] Entity property IDs', JSON.stringify({
          entityPropertyIds: Array.from(entityPropertyIds),
          entityPropertyIdsCount: entityPropertyIds.size
        }))
      } catch {}
      
      filteredDirectInvestments = formattedInvestments.filter((di: any) => {
        const diPropertyId = String(di.propertyId)
        const hasEntityVersion = entityPropertyIds.has(diPropertyId)
        if (hasEntityVersion) {
          try {
            console.log('[INVESTORS/PROPERTIES] Filtering out direct investment (entity exists)', JSON.stringify({
              property: di.propertyName,
              directAmount: di.investmentAmount,
              directPropertyId: diPropertyId,
              matchingEntityInvestments: formattedEntityInvestments
                .filter((ei: any) => String(ei.propertyId) === diPropertyId)
                .map((ei: any) => ({
                  entityName: ei.entityName,
                  entityAmount: ei.investmentAmount,
                  owners: (ei.entityOwners || []).map((o: any) => ({ name: o.userName, amount: o.investmentAmount }))
                }))
            }))
          } catch {}
        } else {
          // Log when keeping a direct investment (no entity version)
          try {
            console.log('[INVESTORS/PROPERTIES] Keeping direct investment (no entity)', JSON.stringify({
              property: di.propertyName,
              directAmount: di.investmentAmount,
              directPropertyId: diPropertyId
            }))
          } catch {}
        }
        return !hasEntityVersion // Keep only if NO entity investment exists
      })
      if (originalCount !== filteredDirectInvestments.length) {
        try {
          console.log('[INVESTORS/PROPERTIES] Filtered direct investments', JSON.stringify({
            before: originalCount,
            after: filteredDirectInvestments.length,
            excluded: originalCount - filteredDirectInvestments.length
          }))
        } catch {}
      }
    }
    
    // Process all investments and group by propertyId
    const allInvestments = filteredDirectInvestments.concat(formattedEntityInvestments)
    allInvestments.forEach((investment: any) => {
      const propertyId = investment.propertyId
      
      if (!investmentsByPropertyId.has(propertyId)) {
        // First investment for this property - create base entry
        investmentsByPropertyId.set(propertyId, {
          ...investment,
          // For entity investments, preserve all entity owner info
          allEntityInvestments: investment.investmentType === 'ENTITY' ? [investment] : [],
          directInvestments: investment.investmentType === 'DIRECT' ? [investment] : []
        })
      } else {
        // Property already exists - add to existing
        const existing = investmentsByPropertyId.get(propertyId)!
        
        if (investment.investmentType === 'ENTITY') {
          existing.allEntityInvestments.push(investment)
        } else {
          existing.directInvestments.push(investment)
        }
      }
    })
    
    // Convert to final array - use primary entity investment for display if exists
    const uniqueInvestments = Array.from(investmentsByPropertyId.values()).map((item: any) => {
      // If there are entity investments, use the primary one (largest investment amount)
      if (item.allEntityInvestments.length > 0) {
        const primaryEntity = item.allEntityInvestments.reduce((prev: any, curr: any) => 
          curr.investmentAmount > prev.investmentAmount ? curr : prev
        )
        
        // For investors: if entity investment exists, ignore direct investments (they're duplicates/incorrect data)
        // For admins: keep both for reference
        if (user.role === 'INVESTOR') {
          // Log when we're excluding a direct investment due to entity investment
          if (item.directInvestments.length > 0) {
            try {
              console.log('[INVESTORS/PROPERTIES] Excluding direct investment in favor of entity', JSON.stringify({
                property: primaryEntity.propertyName,
                excludedDirectAmount: item.directInvestments.reduce((s: number, d: any) => s + (d.investmentAmount || 0), 0),
                usingEntityAmount: primaryEntity.investmentAmount
              }))
            } catch {}
          }
        }
        
        return {
          ...primaryEntity,
          // Keep all entity info for nested ownership display
          allEntityInvestments: item.allEntityInvestments,
          // For investors, exclude direct investments when entity exists
          directInvestments: user.role === 'INVESTOR' ? [] : item.directInvestments
        }
      }
      return item
    })

    // Helper: monthly payment for amortizing loan
    const calcMonthlyPayment = (principal: number, annualRate: number, years: number) => {
      if (!principal || !annualRate || !years) return 0
      const r = (annualRate / 100) / 12
      const n = years * 12
      if (r === 0) return principal / n
      return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    }

    // Helper: remaining balance after k payments for amortizing loan
    const calcRemainingBalance = (principal: number, annualRate: number, years: number, monthsElapsed: number) => {
      if (!principal || !annualRate || !years) return principal
      const r = (annualRate / 100) / 12
      const n = years * 12
      const k = Math.min(Math.max(monthsElapsed, 0), n)
      if (r === 0) return principal * (1 - k / n)
      const pmt = calcMonthlyPayment(principal, annualRate, years)
      const balance = principal * Math.pow(1 + r, k) - pmt * (Math.pow(1 + r, k) - 1) / r
      return Math.max(balance, 0)
    }

    // Fetch loans and compute estimated debt/debt service per property
    const withDebtEstimates = await Promise.all(uniqueInvestments.map(async (inv: any) => {
      try {
        const loans = await prisma.propertyLoan.findMany({
          where: { propertyId: inv.propertyId, isActive: true }
        })

        let estimatedCurrentDebt = 0
        let totalOriginalDebt = 0
        let estimatedMonthlyDebtService = 0
        const now = new Date()
        let earliestLoanDate: Date | null = null

        for (const loan of loans) {
          totalOriginalDebt += loan.originalAmount || 0
          const paymentType = (loan as any).paymentType || 'AMORTIZING'
          const amortYears = (loan as any).amortizationYears || null
          const rate = loan.interestRate || 0
          const principal = loan.currentBalance ?? loan.originalAmount
          const start = loan.loanDate ? new Date(loan.loanDate) : null
          
          // Track earliest loan closing date for IRR calculation
          if (start && (!earliestLoanDate || start < earliestLoanDate)) {
            earliestLoanDate = start
          }
          
          const monthsElapsed = start ? Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())) : 0

          if (paymentType === 'IO') {
            // Interest-only: assume principal unchanged
            estimatedCurrentDebt += principal
            estimatedMonthlyDebtService += rate > 0 ? (principal * (rate / 100)) / 12 : (loan.monthlyPayment || 0)
          } else if (amortYears) {
            // Amortizing: estimate remaining balance and monthly payment
            const remaining = calcRemainingBalance(principal, rate || 0, amortYears, monthsElapsed)
            estimatedCurrentDebt += remaining
            const pmt = loan.monthlyPayment || calcMonthlyPayment(principal, rate || 0, amortYears)
            estimatedMonthlyDebtService += pmt
          } else {
            // Fallback: treat as interest-only if no amort term
            estimatedCurrentDebt += principal
            estimatedMonthlyDebtService += rate > 0 ? (principal * (rate / 100)) / 12 : (loan.monthlyPayment || 0)
          }
        }

        // Compute estimated IRR per spec using simple 5-year model
        // Start date for proforma: use earliest loan closing date if available, otherwise use investment date or acquisition date
        const proformaStartDate = earliestLoanDate || 
          (inv.investmentDate ? new Date(inv.investmentDate) : null) ||
          (inv.property?.acquisitionDate ? new Date(inv.property.acquisitionDate) : new Date())
        
        const annualNOI = (((inv.property?.monthlyRent || 0) * 12) + ((inv.property?.otherIncome || 0) * 12)) - (inv.property?.annualExpenses || 0)
        const annualDebtService = estimatedMonthlyDebtService * 12
        const yearCashFlows: number[] = []
        // Year 0 is negative equity (investment amount) - this represents the loan closing date
        yearCashFlows.push(-(inv.investmentAmount || 0))
        // Years 1-4
        for (let y = 1; y <= 4; y++) {
          yearCashFlows.push(annualNOI - annualDebtService)
        }
        // Year 5 adds sale proceeds (estimated value - payoff)
        const estimatedValue = (inv.property?.capRate && inv.property.capRate > 0) ? (annualNOI / (inv.property.capRate / 100)) : 0
        const saleProceeds = Math.max(estimatedValue - estimatedCurrentDebt, 0)
        yearCashFlows.push((annualNOI - annualDebtService) + saleProceeds)

        const calcIRR = (cfs: number[]) => {
          // Bisection method between -0.99 and 1.0 (i.e., -99% to 100% annual IRR)
          let low = -0.99, high = 1.0
          const npv = (rate: number) => cfs.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0)
          let mid = 0
          for (let i = 0; i < 60; i++) {
            mid = (low + high) / 2
            const v = npv(mid)
            if (Math.abs(v) < 1e-6) break
            if (v > 0) low = mid; else high = mid
          }
        
          return mid * 100 // percentage
        }

        const irrCalculated = calcIRR(yearCashFlows)

        const result = {
          ...inv,
          estimatedCurrentDebt: Math.round(estimatedCurrentDebt),
          estimatedMonthlyDebtService: Math.round(estimatedMonthlyDebtService),
          irr: Math.round(irrCalculated * 100) / 100,
          totalOriginalDebt: Math.round(totalOriginalDebt),
          totalProjectCost: Math.round((inv.investmentAmount || 0) + totalOriginalDebt),
          proformaStartDate: proformaStartDate.toISOString() // Store the start date for proforma calculations
        }

        try {
          console.log('[INVESTORS/PROPERTIES] Debt estimate', JSON.stringify({
            role: user.role,
            property: inv.property?.name || inv.propertyName,
            investmentAmount: inv.investmentAmount,
            estimatedCurrentDebt: result.estimatedCurrentDebt,
            estimatedMonthlyDebtService: result.estimatedMonthlyDebtService,
            irr: result.irr
          }))
        } catch {}

        return result
      } catch (_) {
        return { ...inv }
      }
    }))

    try {
      // Final response aggregates to compare admin vs investor easily
      const totals = {
        role: user.role,
        propertiesCount: withDebtEstimates.length,
        totalInvestmentAmount: withDebtEstimates.reduce((s: number, i: any) => s + (i.investmentAmount || 0), 0),
        totalEstimatedDebt: withDebtEstimates.reduce((s: number, i: any) => s + (i.estimatedCurrentDebt || 0), 0),
        sample: withDebtEstimates.slice(0, 3).map(i => ({ property: i.property?.name || i.propertyName, amount: i.investmentAmount }))
      }
      console.log('[INVESTORS/PROPERTIES] Response summary', JSON.stringify(totals))
    } catch {}

    return NextResponse.json(withDebtEstimates)
  } catch (error) {
    console.error('Error fetching investor properties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has permission to create investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Real investment creation
    const investment = await prisma.investment.create({
      data: {
        userId: user.id,
        propertyId: body.propertyId || 'temp-property-id',
        investmentAmount: body.investmentAmount || 0,
        ownershipPercentage: body.ownershipPercentage || 100,
        status: 'ACTIVE'
      }
    })
    
    return NextResponse.json(investment, { status: 201 })
  } catch (error) {
    console.error('Error creating investment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 