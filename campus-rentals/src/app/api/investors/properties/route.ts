import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Properties API called for user:', user.email)

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
      console.log(`Admin found ${investments.length} total investments`)
      
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
      console.log(`Admin found ${entityInvestments.length} total entity investments`)
    } else {
      // Investors only see their own investments
      investments = await prisma.investment.findMany({
        where: { userId: user.id },
        include: { 
          property: true,
          distributions: true
        }
      })
      console.log(`Found ${investments.length} investments for user ${user.email}`)
      
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
      console.log(`Found ${entityInvestments.length} entity investments for user ${user.email}`)
    }

    // Transform the regular investments data
    const formattedInvestments = investments.map(investment => {
      const totalDistributions = investment.distributions.reduce((sum, dist) => sum + dist.amount, 0)
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
        // Include investor info for admin view
        investorName: user.role === 'ADMIN' && 'user' in investment ? `${(investment as any).user.firstName} ${(investment as any).user.lastName}` : null,
        investorEmail: user.role === 'ADMIN' && 'user' in investment ? (investment as any).user.email : null,
        distributions: investment.distributions.map(dist => ({
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
        },
        investmentType: 'DIRECT' // Mark as direct investment
      }
    })

    // Transform the entity investments data
    const formattedEntityInvestments = entityInvestments.map(entityInvestment => {
      const totalDistributions = entityInvestment.entityDistributions.reduce((sum, dist) => sum + dist.amount, 0)
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
        // Include investor info for admin view
        investorName: user.role === 'ADMIN' ? investorName : null,
        investorEmail: user.role === 'ADMIN' ? investorEmail : null,
        distributions: entityInvestment.entityDistributions.map(dist => ({
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
        },
        investmentType: 'ENTITY', // Mark as entity investment
        entityName: entityInvestment.entity.name,
        entityType: entityInvestment.entity.type,
        entityOwners: entityInvestment.entity.entityOwners.map(owner => ({
          id: owner.id,
          userId: owner.userId,
          userName: `${owner.user.firstName} ${owner.user.lastName}`,
          userEmail: owner.user.email,
          ownershipPercentage: owner.ownershipPercentage,
          investmentAmount: owner.investmentAmount
        }))
      }
    })

    // Combine both types of investments
    const allInvestments = [...formattedInvestments, ...formattedEntityInvestments]

    return NextResponse.json(allInvestments)
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