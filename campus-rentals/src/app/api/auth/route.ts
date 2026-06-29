import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, registerUser, requestPasswordReset, resetPassword, changePassword, getUserById, acceptInvite, getValidInvite } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

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
        return await handleRequestPasswordReset(data, request)
      case 'reset-password':
        return await handleResetPassword(data)
      case 'change-password':
        return await handleChangePassword(data, request)
      case 'accept-invite':
        return await handleAcceptInvite(data)
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
      case 'invite-info':
        return await handleInviteInfo(searchParams.get('token'))
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

async function handleRequestPasswordReset(data: { email: string }, request: NextRequest) {
  // Always return the same generic success response so we never reveal whether an
  // account exists (enumeration). Rate-limit per IP to blunt abuse / email bombing.
  const generic = NextResponse.json({
    success: true,
    message: 'If an account exists for that email, a password reset link is on its way.',
  })

  try {
    const ip = getClientIp(request)
    const limited = rateLimit(`pwreset:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } }
      )
    }

    if (!data?.email || typeof data.email !== 'string') {
      return generic
    }

    // requestPasswordReset returns a token whether or not the user exists; it only
    // persists a real token when the account is found.
    const result = await requestPasswordReset(data)
    const user = await getUserByEmail(data.email)
    if (user && result?.token) {
      // Fire the email but never surface its outcome to the caller.
      await sendPasswordResetEmail(user.email, result.token)
    }
    return generic
  } catch (error) {
    // Even on internal failure, don't leak details — log and return the generic message.
    console.error('Password reset request failed:', error)
    return generic
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

async function handleAcceptInvite(data: { token: string; password: string; firstName?: string; lastName?: string; phone?: string }) {
  try {
    const result = await acceptInvite(data)
    return NextResponse.json({ success: true, user: result.user, token: result.token })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not accept invitation' },
      { status: 400 }
    )
  }
}

async function handleInviteInfo(token: string | null) {
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }
  const invite = await getValidInvite(token)
  if (!invite) {
    return NextResponse.json({ valid: false })
  }
  // Only surface non-sensitive fields needed to prefill the accept form.
  return NextResponse.json({
    valid: true,
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
  })
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
