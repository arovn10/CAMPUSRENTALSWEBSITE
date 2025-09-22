import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    const { currentPassword, newPassword, confirmPassword } = await request.json()
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Current password, new password, and confirmation are required' },
        { status: 400 }
      )
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New passwords do not match' },
        { status: 400 }
      )
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    
    // Get user with current password
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      message: 'Password updated successfully',
      userId: user.id,
      userEmail: user.email
    })
    
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }
}
