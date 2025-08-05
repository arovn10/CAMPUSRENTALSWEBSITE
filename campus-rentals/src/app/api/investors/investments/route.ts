import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    
    // Create new investment in database
    const investment = await prisma.investment.create({
      data: {
        userId: body.investorId,
        propertyId: body.projectId,
        investmentAmount: body.investmentAmount,
        ownershipPercentage: body.ownershipPercentage,
        status: body.status || 'ACTIVE',
        investmentDate: new Date(body.startDate || new Date())
      }
    })
    
    return NextResponse.json(investment, { status: 201 })
  } catch (error) {
    console.error('Error creating investment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    console.log('Investments API called for user:', user.email)

    // Get real investments from database
    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      include: { 
        property: true,
        distributions: true
      }
    })

    console.log(`Found ${investments.length} investments for user ${user.email}`)

    // Transform the data to match the expected format
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
        distributions: investment.distributions.map(dist => ({
          id: dist.id,
          amount: dist.amount,
          distributionDate: dist.distributionDate.toISOString(),
          distributionType: dist.distributionType,
          description: `${dist.distributionType} distribution`
        }))
      }
    })

    return NextResponse.json(formattedInvestments)
  } catch (error) {
    console.error('Error fetching investments:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 