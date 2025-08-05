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
    
    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: body.role,
        company: body.company,
        phone: body.phone
      }
    })
    
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
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
    
    // Check if user is trying to delete themselves
    if (user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }
    
    // Delete user and all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete fund contributions
      await tx.fundContribution.deleteMany({
        where: { userId: params.id }
      })
      
      // Delete fund distributions
      await tx.fundDistribution.deleteMany({
        where: { userId: params.id }
      })
      
      // Delete distributions
      await tx.distribution.deleteMany({
        where: { userId: params.id }
      })
      
      // Delete notifications
      await tx.notification.deleteMany({
        where: { userId: params.id }
      })
      
      // Delete documents
      await tx.document.deleteMany({
        where: { uploadedBy: params.id }
      })
      
      // Delete fund investments
      await tx.fundInvestment.deleteMany({
        where: { userId: params.id }
      })
      
      // Delete investments
      await tx.investment.deleteMany({
        where: { userId: params.id }
      })
      
      // Finally delete the user
      await tx.user.delete({
        where: { id: params.id }
      })
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 