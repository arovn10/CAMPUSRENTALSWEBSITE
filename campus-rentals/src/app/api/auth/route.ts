import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, registerUser, requestPasswordReset, resetPassword, verifyEmail, changePassword, getUserById } from '@/lib/auth'
import { emailService } from '@/lib/emailService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'login':
        return await handleLogin(data)
      case 'register':
        return await handleRegister(data)
      case 'request-password-reset':
        return await handleRequestPasswordReset(data)
      case 'reset-password':
        return await handleResetPassword(data)
      case 'verify-email':
        return await handleVerifyEmail(data)
      case 'change-password':
        return await handleChangePassword(data, request)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'me':
        return await handleGetMe(request)
      case 'verify-email':
        return await handleVerifyEmailFromToken(searchParams.get('token'))
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleLogin(data: { email: string; password: string }) {
  try {
    const result = await authenticateUser(data)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    )
  }
}

async function handleRegister(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
}) {
  try {
    const result = await registerUser(data)

    // Send welcome email with verification
    const verificationToken = await getVerificationToken(result.user.id)
    if (verificationToken) {
      await emailService.sendWelcomeEmail(
        result.user.email,
        result.user.firstName,
        verificationToken
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
      message: 'Registration successful. Please check your email to verify your account.'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    )
  }
}

async function handleRequestPasswordReset(data: { email: string }) {
  try {
    const result = await requestPasswordReset(data)

    // Send password reset email
    const user = await getUserByEmail(data.email)
    if (user) {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        result.token
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Password reset request failed' },
      { status: 400 }
    )
  }
}

async function handleResetPassword(data: { token: string; password: string }) {
  try {
    await resetPassword(data)

    return NextResponse.json({
      success: true,
      message: 'Password reset successful'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Password reset failed' },
      { status: 400 }
    )
  }
}

async function handleVerifyEmail(data: { token: string }) {
  try {
    await verifyEmail(data.token)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Email verification failed' },
      { status: 400 }
    )
  }
}

async function handleVerifyEmailFromToken(token: string | null) {
  if (!token) {
    return NextResponse.json(
      { error: 'Verification token is required' },
      { status: 400 }
    )
  }

  try {
    await verifyEmail(token)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Email verification failed' },
      { status: 400 }
    )
  }
}

async function handleChangePassword(data: {
  currentPassword: string
  newPassword: string
}, request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    await changePassword(user.id, data.currentPassword, data.newPassword)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Password change failed' },
      { status: 400 }
    )
  }
}

async function handleGetMe(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 401 }
    )
  }
}

// Helper functions
async function getVerificationToken(userId: string): Promise<string | null> {
  const { prisma } = await import('@/lib/prisma')
  
  const token = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      used: false,
      expiresAt: { gt: new Date() }
    }
  })

  return token?.token || null
}

async function getUserByEmail(email: string) {
  const { prisma } = await import('@/lib/prisma')
  
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  })
}

async function getUserFromToken(token: string) {
  const { verifyToken } = await import('@/lib/auth')
  return verifyToken(token)
}
