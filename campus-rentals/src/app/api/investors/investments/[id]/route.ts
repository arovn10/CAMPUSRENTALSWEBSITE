import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    
    console.log('Investment Update Debug:', {
      investmentId: params.id,
      userId: user.id,
      userEmail: user.email,
      bodyKeys: Object.keys(body),
      bodyData: body
    })
    
    // First get the investment to find the property ID
    console.log('Looking for investment with ID:', params.id)
    const existingInvestment = await prisma.investment.findUnique({
      where: { id: params.id },
      include: { property: true }
    })
    
    console.log('Existing investment found:', !!existingInvestment)
    if (existingInvestment) {
      console.log('Investment details:', {
        id: existingInvestment.id,
        propertyId: existingInvestment.propertyId,
        propertyName: existingInvestment.property?.name
      })
    } else {
      // Let's check if there are any investments in the database
      const allInvestments = await prisma.investment.findMany({
        select: { id: true, propertyId: true }
      })
      console.log('All investments in database:', allInvestments)
    }
    
    if (!existingInvestment) {
      console.log('Investment not found for ID:', params.id)
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      )
    }
    
    // Update investment in database
    console.log('Updating investment with data:', {
      investmentAmount: parseFloat(body.investmentAmount) || 0,
      ownershipPercentage: parseFloat(body.ownershipPercentage) || 0,
      status: body.status || 'ACTIVE',
    })
    
    const investment = await prisma.investment.update({
      where: { id: params.id },
      data: {
        investmentAmount: parseFloat(body.investmentAmount) || 0,
        ownershipPercentage: parseFloat(body.ownershipPercentage) || 0,
        status: body.status || 'ACTIVE',
      }
    })
    
    console.log('Investment updated successfully:', {
      id: investment.id,
      investmentAmount: investment.investmentAmount,
      ownershipPercentage: investment.ownershipPercentage,
      status: investment.status
    })
    
    // Calculate total cost as sum of acquisition price and construction cost
    const acquisitionPrice = parseFloat(body.acquisitionPrice) || 0;
    const constructionCost = parseFloat(body.constructionCost) || 0;
    const calculatedTotalCost = acquisitionPrice + constructionCost;
    
    // Calculate current value based on NOI and cap rate
    const monthlyRent = parseFloat(body.monthlyRent) || 0;
    const annualExpenses = parseFloat(body.annualExpenses) || 0;
    const capRate = parseFloat(body.capRate) || 0;
    
    let calculatedCurrentValue = 0;
    if (capRate > 0) {
      const annualRent = monthlyRent * 12;
      const noi = annualRent - annualExpenses;
      calculatedCurrentValue = noi / (capRate / 100);
    }
    
    // Update property details
    console.log('Updating property with data:', {
      propertyId: existingInvestment.propertyId,
      name: body.propertyName,
      address: body.propertyAddress,
      acquisitionPrice: acquisitionPrice,
      constructionCost: constructionCost,
      totalCost: calculatedTotalCost,
      monthlyRent: parseFloat(body.monthlyRent) || 0,
      annualExpenses: parseFloat(body.annualExpenses) || 0,
      capRate: parseFloat(body.capRate) || 0,
      currentValue: calculatedCurrentValue,
      debtAmount: parseFloat(body.debtAmount) || null,
      debtDetails: body.debtDetails || null,
    })
    
    const property = await prisma.property.update({
      where: { id: existingInvestment.propertyId },
      data: {
        name: body.propertyName,
        address: body.propertyAddress,
        description: body.description,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        squareFeet: body.squareFeet,
        propertyType: body.propertyType,
        acquisitionPrice: acquisitionPrice,
        constructionCost: constructionCost,
        totalCost: calculatedTotalCost, // Use calculated value to ensure accuracy
        acquisitionDate: body.acquisitionDate,
        constructionCompletionDate: body.constructionCompletionDate,
        stabilizationDate: body.stabilizationDate,
        occupancyRate: parseFloat(body.occupancyRate) || 0,
        monthlyRent: parseFloat(body.monthlyRent) || 0,
        otherIncome: parseFloat(body.otherIncome) || 0,
        annualExpenses: parseFloat(body.annualExpenses) || 0,
        capRate: parseFloat(body.capRate) || 0,
        currentValue: calculatedCurrentValue,
        debtAmount: parseFloat(body.debtAmount) || null,
        debtDetails: body.debtDetails || null,
      }
    })
    
    console.log('Property updated successfully:', {
      id: property.id,
      name: property.name,
      acquisitionPrice: property.acquisitionPrice,
      constructionCost: property.constructionCost,
      totalCost: property.totalCost,
      monthlyRent: property.monthlyRent,
      annualExpenses: property.annualExpenses,
      capRate: property.capRate,
      currentValue: property.currentValue,
      debtAmount: property.debtAmount,
    })
    
    return NextResponse.json({ investment, property })
  } catch (error) {
    console.error('Error updating investment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    // Delete investment from database
    await prisma.investment.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting investment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 