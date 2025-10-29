import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/properties/[id]/loans/[loanId]
 * Update a loan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; loanId: string } }
) {
  try {
    const user = await requireAuth(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to manage loans
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and managers can update loans.' },
        { status: 403 }
      )
    }

    const { id: propertyId, loanId } = params
    const body = await request.json()

    // Verify loan exists and belongs to property
    const existingLoan = await prisma.propertyLoan.findFirst({
      where: {
        id: loanId,
        propertyId: propertyId
      }
    })

    if (!existingLoan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Update the loan
    const loan = await prisma.propertyLoan.update({
      where: { id: loanId },
      data: {
        lenderName: body.lenderName !== undefined ? body.lenderName : existingLoan.lenderName,
        accountNumber: body.accountNumber !== undefined ? body.accountNumber : existingLoan.accountNumber,
        originalAmount: body.originalAmount !== undefined ? parseFloat(body.originalAmount) : existingLoan.originalAmount,
        currentBalance: body.currentBalance !== undefined ? parseFloat(body.currentBalance) : existingLoan.currentBalance,
        interestRate: body.interestRate !== undefined ? (body.interestRate ? parseFloat(body.interestRate) : null) : existingLoan.interestRate,
        loanDate: body.loanDate !== undefined ? (body.loanDate ? new Date(body.loanDate) : null) : existingLoan.loanDate,
        maturityDate: body.maturityDate !== undefined ? (body.maturityDate ? new Date(body.maturityDate) : null) : existingLoan.maturityDate,
        monthlyPayment: body.monthlyPayment !== undefined ? (body.monthlyPayment ? parseFloat(body.monthlyPayment) : null) : existingLoan.monthlyPayment,
        loanType: body.loanType !== undefined ? body.loanType : existingLoan.loanType,
        notes: body.notes !== undefined ? body.notes : existingLoan.notes,
        isActive: body.isActive !== undefined ? body.isActive : existingLoan.isActive
      }
    })

    // Update property debt amount (sum of all active loans)
    const activeLoans = await prisma.propertyLoan.findMany({
      where: {
        propertyId: propertyId,
        isActive: true
      }
    })

    const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0)

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        debtAmount: totalDebt,
        debtDetails: activeLoans.map(loan => 
          `${loan.lenderName}: $${loan.currentBalance.toLocaleString()}`
        ).join('; ')
      }
    })

    return NextResponse.json({
      success: true,
      loan,
      message: 'Loan updated successfully'
    })
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/properties/[id]/loans/[loanId]
 * Delete a loan (or mark as inactive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; loanId: string } }
) {
  try {
    const user = await requireAuth(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to manage loans
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and managers can delete loans.' },
        { status: 403 }
      )
    }

    const { id: propertyId, loanId } = params

    // Verify loan exists and belongs to property
    const existingLoan = await prisma.propertyLoan.findFirst({
      where: {
        id: loanId,
        propertyId: propertyId
      }
    })

    if (!existingLoan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Delete the loan
    await prisma.propertyLoan.delete({
      where: { id: loanId }
    })

    // Update property debt amount (sum of all active loans)
    const activeLoans = await prisma.propertyLoan.findMany({
      where: {
        propertyId: propertyId,
        isActive: true
      }
    })

    const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0)

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        debtAmount: totalDebt,
        debtDetails: activeLoans.length > 0
          ? activeLoans.map(loan => 
              `${loan.lenderName}: $${loan.currentBalance.toLocaleString()}`
            ).join('; ')
          : null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Loan deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting loan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

