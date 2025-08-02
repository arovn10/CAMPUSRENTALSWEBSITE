import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hasPermission, getAllInvestments, getInvestmentsByUser, createInvestment, updateInvestment, deleteInvestment, Investment } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (hasPermission(user, 'ADMIN')) {
      // Admin can see all investments
      const investments = await getAllInvestments();
      return NextResponse.json({ success: true, data: investments });
    } else {
      // Investors can only see their own investments
      const investments = await getInvestmentsByUser(user.id);
      return NextResponse.json({ success: true, data: investments });
    }
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!hasPermission(user, 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { name, propertyAddress, totalInvestment, investorId, investorEmail, investmentAmount, ownershipPercentage, startDate, expectedReturn, status } = body;
    
    if (!name || !propertyAddress || !totalInvestment || !investorId || !investorEmail || !investmentAmount || !ownershipPercentage || !startDate || !expectedReturn || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const newInvestment = await createInvestment({
      name,
      propertyAddress,
      totalInvestment: Number(totalInvestment),
      investorId,
      investorEmail,
      investmentAmount: Number(investmentAmount),
      ownershipPercentage: Number(ownershipPercentage),
      startDate,
      expectedReturn: Number(expectedReturn),
      status
    });
    
    return NextResponse.json({ success: true, data: newInvestment });
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!hasPermission(user, 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Investment ID is required' },
        { status: 400 }
      );
    }
    
    const updatedInvestment = await updateInvestment(id, updates);
    
    if (!updatedInvestment) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: updatedInvestment });
  } catch (error) {
    console.error('Error updating investment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update investment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!hasPermission(user, 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Investment ID is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteInvestment(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Error deleting investment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete investment' },
      { status: 500 }
    );
  }
} 