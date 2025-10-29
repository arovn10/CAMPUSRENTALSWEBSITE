import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, registerUser, requestPasswordReset, resetPassword, changePassword, getUserById } from '@/lib/auth'

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

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
      message: 'Registration successful.'
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

    // Password reset tokens are generated but emails are not sent
    // Admin must manually reset passwords through admin panel

    return NextResponse.json({
      success: true,
      message: 'Password reset functionality requires admin assistance. Please contact your administrator.'
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

// Email verification handlers removed

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
