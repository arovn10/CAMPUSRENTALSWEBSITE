import { NextRequest, NextResponse } from 'next/server'
import { authenticateWithPassword } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // Per-IP throttle on login to blunt credential brute-force / spraying.
    // (auth.ts also enforces per-account lockout after 5 failures; this is the IP layer.)
    const ip = getClientIp(request)
    const limit = rateLimit(`login:${ip}`, { max: 10 })
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await authenticateWithPassword({ email, password })

    if (!result || !result.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Return user data AND token
    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isActive: result.user.isActive,
        emailVerified: result.user.emailVerified
      },
      token: result.token
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
} 