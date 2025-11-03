import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    console.log('Entity investment update attempt by:', user.email, 'Role:', user.role, 'Entity ID:', params.id)
    
    // Allow admins, managers, and investors to update entity investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      console.log('Unauthorized entity investment update attempt by:', user.email, 'Role:', user.role)
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    try {
      const ownersSummary = (body.entityOwners || []).map((o: any) => ({
        userId: o.userId || null,
        investorEntityId: o.investorEntityId || null,
        ownershipPercentage: o.ownershipPercentage,
        investmentAmount: o.investmentAmount,
        breakdownCount: Array.isArray(o.breakdown) ? o.breakdown.length : 0,
        breakdownTotal: Array.isArray(o.breakdown) ? o.breakdown.reduce((s: number, r: any) => s + (parseFloat(r.amount || 0)), 0) : 0
      }))
      console.log('Entity investment update request body (summary):', {
        investmentAmount: body.investmentAmount,
        ownershipPercentage: body.ownershipPercentage,
        entityOwnersCount: body.entityOwners?.length || 0,
        owners: ownersSummary
      })
      // Raw payload (truncated)
      console.log('Raw owners payload (truncated):', JSON.stringify(body.entityOwners || []).slice(0, 2000))
    } catch (logErr) {
      console.warn('Failed logging request body:', logErr)
    }
    
    // First check if the entity investment exists
    const existingEntityInvestment = await prisma.entityInvestment.findUnique({
      where: { id: params.id },
      include: { 
        entity: true,
        property: true
      }
    })
    
    if (!existingEntityInvestment) {
      console.log('Entity investment not found:', params.id)
      return NextResponse.json(
        { error: 'Entity investment not found' },
        { status: 404 }
      )
    }
    
    console.log('Found existing entity investment:', {
      id: existingEntityInvestment.id,
      entityId: existingEntityInvestment.entityId,
      entityName: existingEntityInvestment.entity?.name
    })
    
    // Update entity investment, its owners, and property in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the entity investment
      const entityInvestment = await tx.entityInvestment.update({
        where: { id: params.id },
        data: {
          investmentAmount: body.investmentAmount,
          ownershipPercentage: body.ownershipPercentage
        }
      })

      // Update property if property-related fields are provided
      if (existingEntityInvestment.propertyId && (body.debtAmount !== undefined || body.debtDetails !== undefined || 
          body.propertyName || body.propertyAddress || body.description || body.bedrooms || body.bathrooms || 
          body.squareFeet || body.propertyType || body.acquisitionPrice !== undefined || 
          body.constructionCost !== undefined || body.totalCost !== undefined || body.acquisitionDate || 
          body.constructionCompletionDate || body.stabilizationDate || body.occupancyRate !== undefined || 
          body.monthlyRent !== undefined || body.annualExpenses !== undefined || body.capRate !== undefined)) {
        
        console.log('Updating property with data:', {
          propertyId: existingEntityInvestment.propertyId,
          debtAmount: body.debtAmount,
          debtDetails: body.debtDetails,
          propertyName: body.propertyName,
          propertyAddress: body.propertyAddress,
          acquisitionPrice: body.acquisitionPrice,
          constructionCost: body.constructionCost,
          totalCost: body.totalCost,
          monthlyRent: body.monthlyRent,
          annualExpenses: body.annualExpenses,
          capRate: body.capRate
        })

        const property = await tx.property.update({
          where: { id: existingEntityInvestment.propertyId },
          data: {
            name: body.propertyName || existingEntityInvestment.property?.name,
            address: body.propertyAddress || existingEntityInvestment.property?.address,
            description: body.description || existingEntityInvestment.property?.description,
            bedrooms: body.bedrooms || existingEntityInvestment.property?.bedrooms,
            bathrooms: body.bathrooms || existingEntityInvestment.property?.bathrooms,
            squareFeet: body.squareFeet || existingEntityInvestment.property?.squareFeet,
            propertyType: body.propertyType || existingEntityInvestment.property?.propertyType,
            acquisitionPrice: body.acquisitionPrice !== undefined ? parseFloat(body.acquisitionPrice) : existingEntityInvestment.property?.acquisitionPrice,
            constructionCost: body.constructionCost !== undefined ? parseFloat(body.constructionCost) : existingEntityInvestment.property?.constructionCost,
            totalCost: body.totalCost !== undefined ? parseFloat(body.totalCost) : existingEntityInvestment.property?.totalCost,
            acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : existingEntityInvestment.property?.acquisitionDate,
            constructionCompletionDate: body.constructionCompletionDate ? new Date(body.constructionCompletionDate) : existingEntityInvestment.property?.constructionCompletionDate,
            stabilizationDate: body.stabilizationDate ? new Date(body.stabilizationDate) : existingEntityInvestment.property?.stabilizationDate,
            occupancyRate: body.occupancyRate !== undefined ? parseFloat(body.occupancyRate) : existingEntityInvestment.property?.occupancyRate,
            monthlyRent: body.monthlyRent !== undefined ? parseFloat(body.monthlyRent) : existingEntityInvestment.property?.monthlyRent,
            otherIncome: body.otherIncome !== undefined ? parseFloat(body.otherIncome) : existingEntityInvestment.property?.otherIncome,
            annualExpenses: body.annualExpenses !== undefined ? parseFloat(body.annualExpenses) : existingEntityInvestment.property?.annualExpenses,
            capRate: body.capRate !== undefined ? parseFloat(body.capRate) : existingEntityInvestment.property?.capRate,
            debtAmount: body.debtAmount !== undefined ? parseFloat(body.debtAmount) : existingEntityInvestment.property?.debtAmount,
            debtDetails: body.debtDetails || existingEntityInvestment.property?.debtDetails
          }
        })

        console.log('Property updated successfully:', {
          id: property.id,
          name: property.name,
          debtAmount: property.debtAmount,
          debtDetails: property.debtDetails
        })
      }
      
      // Update per-investment entity owners (does not change global entity membership)
      if (body.entityOwners) {
        console.log('Updating entity investment owners for investment:', entityInvestment.id)
        
        // Delete existing owners for this investment only
        const deletedOwners = await tx.entityInvestmentOwner.deleteMany({
          where: { entityInvestmentId: entityInvestment.id }
        })
        console.log('Deleted existing investment owners:', deletedOwners.count)
        
        // Create new owners
        const entityOwners = []
        for (const owner of body.entityOwners) {
          console.log('Processing entity owner (summary):', {
            entityId: entityInvestment.entityId,
            userId: owner.userId,
            investorEntityId: owner.investorEntityId,
            ownershipPercentage: owner.ownershipPercentage,
            investmentAmount: owner.investmentAmount,
            breakdownCount: Array.isArray(owner.breakdown) ? owner.breakdown.length : 0,
            breakdownTotal: Array.isArray(owner.breakdown) ? owner.breakdown.reduce((s: number, r: any) => s + (parseFloat(r.amount || 0)), 0) : 0
          })
          
          const investorEntityId: string | null = owner.investorEntityId || null
          let userId = owner.userId
          
          // If no userId is provided but we have user info, create a new user
          if (!userId && owner.user && owner.user.firstName && owner.user.lastName && owner.user.email) {
            console.log('Processing entity owner without userId:', {
              email: owner.user.email,
              firstName: owner.user.firstName,
              lastName: owner.user.lastName
            })
            
            try {
              // First check if user already exists
              const existingUser = await tx.user.findUnique({
                where: { email: owner.user.email }
              })
              
              if (existingUser) {
                console.log('User already exists, using existing user ID:', existingUser.id)
                userId = existingUser.id
              } else {
                console.log('Creating new user for entity owner:', owner.user)
                const newUser = await tx.user.create({
                  data: {
                    email: owner.user.email,
                    firstName: owner.user.firstName,
                    lastName: owner.user.lastName,
                    role: 'INVESTOR',
                    password: 'temp-password-' + Math.random().toString(36).substring(7) // Temporary password
                  }
                })
                
                userId = newUser.id
                console.log('Created new user with ID:', userId)
              }
            } catch (userError) {
              console.error('Error creating/finding user:', userError)
              
              // If it's a unique constraint error, try to find the user again
              if (userError && typeof userError === 'object' && 'code' in userError && userError.code === 'P2002') {
                console.log('Unique constraint error, attempting to find existing user...')
                try {
                  const existingUser = await tx.user.findUnique({
                    where: { email: owner.user.email }
                  })
                  if (existingUser) {
                    console.log('Found existing user after constraint error:', existingUser.id)
                    userId = existingUser.id
                  } else {
                    throw new Error('User not found after constraint error')
                  }
                } catch (findError) {
                  throw new Error(`Failed to find user after constraint error for email ${owner.user.email}: ${findError instanceof Error ? findError.message : 'Unknown error'}`)
                }
              } else {
                throw new Error(`Failed to create or find user for email ${owner.user.email}: ${userError instanceof Error ? userError.message : 'Unknown error'}`)
              }
            }
          }
          
          if (!userId && !investorEntityId) {
            throw new Error(`Invalid entity owner: missing userId/investorEntityId and user information for owner ${owner.id || 'unknown'}`)
          }
          
          try {
            const entityOwner = await tx.entityInvestmentOwner.create({
              data: {
                entityInvestmentId: entityInvestment.id,
                userId: userId || null,
                investorEntityId: investorEntityId || null,
                ownershipPercentage: parseFloat(owner.ownershipPercentage) || 0,
                investmentAmount: parseFloat(owner.investmentAmount) || 0,
                breakdown: owner.breakdown ? JSON.parse(JSON.stringify(owner.breakdown)) : null
              }
            })
            entityOwners.push(entityOwner)
            console.log('Created entity owner:', {
              id: entityOwner.id,
              entityId: entityOwner.entityId,
              userId: entityOwner.userId,
              ownershipPercentage: entityOwner.ownershipPercentage,
              investmentAmount: entityOwner.investmentAmount,
              hasBreakdown: !!entityOwner.breakdown
            })
          } catch (ownerError) {
            console.error('Error creating entity owner:', ownerError)
            throw new Error(`Failed to create entity owner for user ${userId}: ${ownerError instanceof Error ? ownerError.message : 'Unknown error'}`)
          }
        }
        
        console.log('Created entity owners:', entityOwners.length)
        return { entityInvestment, entityOwners }
      }
      
      return { entityInvestment }
    })
    
    // Fetch the full entity investment with all relations to return to client
    const fullEntityInvestment = await prisma.entityInvestment.findUnique({
      where: { id: result.entityInvestment.id },
      include: {
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
        entityInvestmentOwners: {
          include: {
            user: true,
            investorEntity: true
          }
        },
        property: true,
        entityDistributions: {
          include: {
            user: true
          }
        }
      }
    })
    
    console.log('Entity investment updated successfully:', result.entityInvestment.id)
    return NextResponse.json({ 
      entityInvestment: fullEntityInvestment,
      entityInvestmentOwners: fullEntityInvestment?.entityInvestmentOwners || []
    })
  } catch (error) {
    console.error('Error updating entity investment:', error)
    return NextResponse.json(
      { error: 'Failed to update entity investment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has permission to delete entity investments
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Delete entity investment and related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Get the entity investment to find the entity ID
      const entityInvestment = await tx.entityInvestment.findUnique({
        where: { id: params.id }
      })
      
      if (!entityInvestment) {
        throw new Error('Entity investment not found')
      }
      
      // Delete entity owners
      await tx.entityOwner.deleteMany({
        where: { entityId: entityInvestment.entityId }
      })
      
      // Delete entity distributions
      await tx.entityDistribution.deleteMany({
        where: { entityInvestmentId: params.id }
      })
      
      // Delete the entity investment
      await tx.entityInvestment.delete({
        where: { id: params.id }
      })
    })
    
    return NextResponse.json({ message: 'Entity investment deleted successfully' })
  } catch (error) {
    console.error('Error deleting entity investment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 