import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    
    const investmentType = body.investmentType || 'INVESTOR'
    const isSpectator = investmentType === 'SPECTATOR'
    
    // Validate required fields based on investment type
    if (!isSpectator) {
      if (!body.investorId || !body.projectId) {
        return NextResponse.json(
          { error: 'Investor ID and Property ID are required for investor investments' },
          { status: 400 }
        )
      }
    } else {
      // For spectators, only investorId and projectId are required
      if (!body.investorId || !body.projectId) {
        return NextResponse.json(
          { error: 'Investor ID and Property ID are required' },
          { status: 400 }
        )
      }
    }
    
    // Create new investment in database
    const investment = await prisma.investment.create({
      data: {
        userId: body.investorId,
        propertyId: body.projectId,
        investmentType: investmentType,
        investmentAmount: isSpectator ? null : (body.investmentAmount || 0),
        ownershipPercentage: isSpectator ? null : body.ownershipPercentage,
        status: body.status || 'ACTIVE',
        investmentDate: isSpectator ? null : (body.startDate ? new Date(body.startDate) : new Date()),
        preferredReturn: body.preferredReturn || null,
        percentOfProceeds: body.percentOfProceeds || null,
        preferredDistributionMethod: body.preferredDistributionMethod || null,
        paymentMethod: body.paymentMethod || null,
        externalSystem1: body.externalSystem1 || null,
        externalId: body.externalId || null,
        investmentDescription: body.investmentDescription || null,
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
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
    try {
      console.log('[INVESTORS/INVESTMENTS] Request start', JSON.stringify({ role: user.role, userId: user.id, email: (user as any).email || null }))
    } catch {}

    // Get real investments from database
    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      include: { 
        property: true,
        distributions: true
      }
    })

    try {
      const totalAmount = investments.reduce((s, i) => s + (i.investmentAmount || 0), 0)
      console.log('[INVESTORS/INVESTMENTS] Direct investments', JSON.stringify({ count: investments.length, totalAmount }))
    } catch {}

    // Transform the data to match the expected format
    const formattedInvestments = investments.map(investment => {
      const totalDistributions = investment.distributions.reduce((sum, dist) => sum + dist.amount, 0)
      const currentValue = investment.property?.currentValue ?? investment.investmentAmount ?? 0
      const invested = investment.investmentAmount ?? 0
      const totalReturn = currentValue - invested + totalDistributions
      const irr = invested > 0 ? (totalReturn / invested) * 100 : 0

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

    try {
      console.log('[INVESTORS/INVESTMENTS] Response summary', JSON.stringify({ count: formattedInvestments.length, totalAmount: formattedInvestments.reduce((s, i: any) => s + (i.investmentAmount || 0), 0) }))
    } catch {}
    return NextResponse.json(formattedInvestments)
  } catch (error) {
    console.error('Error fetching investments:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 