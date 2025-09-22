import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Check if user has admin permissions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      )
    }
    
    const { email, newPassword } = await request.json()
    
    // Validate input
    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
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
      where: { email }
    })
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found with that email address' },
        { status: 404 }
      )
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user's password
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      message: 'Password reset successfully',
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: `${targetUser.firstName} ${targetUser.lastName}`
    })
    
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
