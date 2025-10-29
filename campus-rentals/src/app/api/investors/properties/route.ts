import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
                  user: true
                }
              }
            }
          }
        }
      })
    } else {
      // Investors only see their own investments
      investments = await prisma.investment.findMany({
        where: { userId: user.id },
        include: { 
          property: true,
          distributions: true
        }
      })
      // For investors, get entity investments where they are owners
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
          }
        },
        where: {
          entity: {
            entityOwners: {
              some: {
                userId: user.id
              }
            }
          }
        }
      })

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
          include: { property: true, entityDistributions: true, entity: { include: { entityOwners: { include: { user: true } } } } }
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
      const totalDistributions = entityInvestment.entityDistributions.reduce((sum: number, dist: any) => sum + dist.amount, 0)
      const currentValue = entityInvestment.property.currentValue || entityInvestment.investmentAmount
      const totalReturn = currentValue - entityInvestment.investmentAmount + totalDistributions
      const irr = entityInvestment.investmentAmount > 0 ? ((currentValue / entityInvestment.investmentAmount - 1) * 100) : 0

      // Get the primary investor (first entity owner) for display
      const primaryOwner = entityInvestment.entity.entityOwners[0]
      const investorName = primaryOwner ? `${primaryOwner.user.firstName} ${primaryOwner.user.lastName}` : 'Multiple Investors'
      const investorEmail = primaryOwner ? primaryOwner.user.email : ''

      return {
        id: entityInvestment.id,
        propertyId: entityInvestment.propertyId,
        propertyName: entityInvestment.property.name,
        propertyAddress: entityInvestment.property.address,
        investmentAmount: entityInvestment.investmentAmount,
        currentValue: currentValue,
        totalReturn: totalReturn,
        irr: Math.round(irr * 100) / 100,
        ownershipPercentage: entityInvestment.ownershipPercentage || 100,
        status: entityInvestment.status,
        investmentDate: entityInvestment.investmentDate.toISOString(),
        // Expose deal/funding status at top-level for UI badges
        dealStatus: (entityInvestment.property as any).dealStatus || 'STABILIZED',
        fundingStatus: (entityInvestment.property as any).fundingStatus || 'FUNDED',
        // Include investor info for admin view
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
        entityOwners: entityInvestment.entity.entityOwners.map((owner: any) => ({
          id: owner.id,
          userId: owner.userId || null,
          userName: owner.user ? `${owner.user.firstName} ${owner.user.lastName}` : (owner.investorEntity ? owner.investorEntity.name : 'Unknown Investor'),
          userEmail: owner.user ? owner.user.email : null,
          investorEntityId: owner.investorEntityId || null,
          investorEntityName: owner.investorEntity ? owner.investorEntity.name : null,
          ownershipPercentage: owner.ownershipPercentage,
          investmentAmount: owner.investmentAmount
        }))
      }
    })

    // Group investments by property ID to prevent duplicate property cards
    // Multiple entity investments for same property should show as ONE property with nested ownership
    const investmentsByPropertyId = new Map<string, any>()
    
    // Process all investments and group by propertyId
    const allInvestments = formattedInvestments.concat(formattedEntityInvestments)
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
        return {
          ...primaryEntity,
          // Keep all entity info for nested ownership display
          allEntityInvestments: item.allEntityInvestments,
          directInvestments: item.directInvestments
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
        let estimatedMonthlyDebtService = 0
        const now = new Date()

        for (const loan of loans) {
          const paymentType = (loan as any).paymentType || 'AMORTIZING'
          const amortYears = (loan as any).amortizationYears || null
          const rate = loan.interestRate || 0
          const principal = loan.currentBalance ?? loan.originalAmount
          const start = loan.loanDate ? new Date(loan.loanDate) : null
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
        const annualNOI = (((inv.property?.monthlyRent || 0) * 12) + ((inv.property?.otherIncome || 0) * 12)) - (inv.property?.annualExpenses || 0)
        const annualDebtService = estimatedMonthlyDebtService * 12
        const yearCashFlows: number[] = []
        // Year 0 is negative equity (investment amount)
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

        return {
          ...inv,
          estimatedCurrentDebt: Math.round(estimatedCurrentDebt),
          estimatedMonthlyDebtService: Math.round(estimatedMonthlyDebtService),
          irr: Math.round(irrCalculated * 100) / 100
        }
      } catch (_) {
        return { ...inv }
      }
    }))

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