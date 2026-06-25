import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getAllUsers, createUser, updateUser, deleteUser, hasPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Admins and managers can access user list (for adding followers)
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const users = await getAllUsers()
    // Return in format expected by DealFollowersManager: { users: [...] }
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Only admins can create users
    if (!hasPermission(user, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role, company, phone, password } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newUser = await createUser({
      email,
      firstName,
      lastName,
      role,
      company,
      phone
    }, password)

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Only admins can update users
    if (!user || !hasPermission(user, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Whitelist updatable columns — never spread raw req.body into Prisma.
    // Password has its own endpoint; id / loginAttempts / tokens are not settable here.
    const ALLOWED_FIELDS = [
      'email', 'firstName', 'lastName', 'role', 'company', 'phone', 'isActive', 'emailVerified',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) updates[field] = body[field]
    }

    const updatedUser = await updateUser(id, updates)
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Only admins can delete users
    if (!hasPermission(user, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const success = await deleteUser(id)
    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 