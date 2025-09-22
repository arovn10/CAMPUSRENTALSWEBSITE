import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has admin permissions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      )
    }
    
    const { newPassword, confirmPassword } = await request.json()
    
    // Validate input
    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation are required' },
        { status: 400 }
      )
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id }
    })
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user's password
    await prisma.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      message: 'Password updated successfully',
      userId: params.id,
      userEmail: targetUser.email
    })
    
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }
}
