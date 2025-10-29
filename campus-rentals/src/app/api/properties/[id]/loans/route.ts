import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/properties/[id]/loans
 * Get all loans for a property
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to view properties
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'INVESTOR') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const propertyId = params.id

    // Get all loans for the property
    const loans = await prisma.propertyLoan.findMany({
      where: {
        propertyId: propertyId
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Calculate totals
    const totalCurrentDebt = loans
      .filter(loan => loan.isActive)
      .reduce((sum, loan) => sum + loan.currentBalance, 0)
    
    const totalOriginalAmount = loans
      .filter(loan => loan.isActive)
      .reduce((sum, loan) => sum + loan.originalAmount, 0)

    return NextResponse.json({
      loans,
      totals: {
        totalCurrentDebt,
        totalOriginalAmount,
        loanCount: loans.filter(loan => loan.isActive).length
      }
    })
  } catch (error) {
    console.error('Error fetching property loans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/properties/[id]/loans
 * Create a new loan for a property
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        { error: 'Insufficient permissions. Only admins and managers can manage loans.' },
        { status: 403 }
      )
    }

    const propertyId = params.id
    const body = await request.json()

    // Validate required fields
    if (!body.lenderName || !body.originalAmount || body.currentBalance === undefined) {
      return NextResponse.json(
        { error: 'Lender name, original amount, and current balance are required' },
        { status: 400 }
      )
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Create the loan
    const loan = await prisma.propertyLoan.create({
      data: {
        propertyId: propertyId,
        lenderName: body.lenderName,
        accountNumber: body.accountNumber || null,
        originalAmount: parseFloat(body.originalAmount),
        currentBalance: parseFloat(body.currentBalance),
        interestRate: body.interestRate ? parseFloat(body.interestRate) : null,
        loanDate: body.loanDate ? new Date(body.loanDate) : null,
        maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
        monthlyPayment: body.monthlyPayment ? parseFloat(body.monthlyPayment) : null,
        loanType: body.loanType || null,
        notes: body.notes || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        createdBy: user.id
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
      message: 'Loan added successfully'
    })
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

