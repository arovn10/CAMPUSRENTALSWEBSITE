import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to update properties
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    console.log('Property update request body:', body)
    console.log('Other income value:', body.otherIncome, 'Type:', typeof body.otherIncome)
    
    // Find the property
    const existingProperty = await prisma.property.findUnique({
      where: { id: params.id }
    })
    
    if (!existingProperty) {
      console.log('Property not found:', params.id)
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }
    
    console.log('Found existing property:', {
      id: existingProperty.id,
      name: existingProperty.name,
      address: existingProperty.address
    })
    
    // Update the property with the provided data
    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        // Basic property fields
        name: body.propertyName || existingProperty.name,
        address: body.propertyAddress || existingProperty.address,
        description: body.description || existingProperty.description,
        bedrooms: body.bedrooms || existingProperty.bedrooms,
        bathrooms: body.bathrooms || existingProperty.bathrooms,
        squareFeet: body.squareFeet || existingProperty.squareFeet,
        propertyType: body.propertyType || existingProperty.propertyType,
        
        // Financial fields
        acquisitionPrice: body.acquisitionPrice !== undefined ? parseFloat(body.acquisitionPrice) : existingProperty.acquisitionPrice,
        constructionCost: body.constructionCost !== undefined ? parseFloat(body.constructionCost) : existingProperty.constructionCost,
        totalCost: body.totalCost !== undefined ? parseFloat(body.totalCost) : existingProperty.totalCost,
        debtAmount: body.debtAmount !== undefined ? parseFloat(body.debtAmount) : existingProperty.debtAmount,
        debtDetails: body.debtDetails || existingProperty.debtDetails,
        currentValue: body.currentValue !== undefined ? parseFloat(body.currentValue) : existingProperty.currentValue,
        
        // NOI-related fields
        occupancyRate: body.occupancyRate !== undefined ? parseFloat(body.occupancyRate) : existingProperty.occupancyRate,
        monthlyRent: body.monthlyRent !== undefined ? parseFloat(body.monthlyRent) : existingProperty.monthlyRent,
        otherIncome: body.otherIncome !== undefined ? parseFloat(body.otherIncome) : existingProperty.otherIncome,
        annualExpenses: body.annualExpenses !== undefined ? parseFloat(body.annualExpenses) : existingProperty.annualExpenses,
        capRate: body.capRate !== undefined ? parseFloat(body.capRate) : existingProperty.capRate,
        
        // Date fields
        acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : existingProperty.acquisitionDate,
        constructionCompletionDate: body.constructionCompletionDate ? new Date(body.constructionCompletionDate) : existingProperty.constructionCompletionDate,
        stabilizationDate: body.stabilizationDate ? new Date(body.stabilizationDate) : existingProperty.stabilizationDate,
      }
    })
    
    console.log('Property updated successfully:', updatedProperty.id)
    console.log('Updated other income:', updatedProperty.otherIncome)
    return NextResponse.json(updatedProperty)
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json(
      { error: 'Failed to update property', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 