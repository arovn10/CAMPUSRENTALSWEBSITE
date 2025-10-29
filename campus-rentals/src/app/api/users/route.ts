import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminUser, getUserById } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { verifyToken } = await import('@/lib/auth')
    const user = verifyToken(token)
    
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.role = role
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          company: true,
          phone: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              investments: true,
              documents: true,
              notifications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { verifyToken } = await import('@/lib/auth')
    const user = verifyToken(token)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'create':
        return await handleCreateUser(data)
      case 'create-admin':
        return await handleCreateAdminUser(data)
      case 'update':
        return await handleUpdateUser(data)
      case 'deactivate':
        return await handleDeactivateUser(data)
      case 'activate':
        return await handleActivateUser(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('User management error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleCreateUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  company?: string
  phone?: string
}) {
  try {
    const { registerUser } = await import('@/lib/auth')
    const result = await registerUser(data)

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'User created successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 400 }
    )
  }
}

async function handleCreateAdminUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
}) {
  try {
    const adminUser = await createAdminUser(data)

    return NextResponse.json({
      success: true,
      user: adminUser,
      message: 'Admin user created successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create admin user' },
      { status: 400 }
    )
  }
}

async function handleUpdateUser(data: {
  userId: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
  role?: string
}) {
  try {
    const { userId, ...updateData } = data

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        company: true,
        phone: true,
        isActive: true,
        emailVerified: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        resource: 'USER',
        resourceId: user.id,
        details: updateData
      }
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'User updated successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 400 }
    )
  }
}

async function handleDeactivateUser(data: { userId: string }) {
  try {
    const user = await prisma.user.update({
      where: { id: data.userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        resource: 'USER',
        resourceId: user.id,
        details: { action: 'DEACTIVATE' }
      }
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'User deactivated successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deactivate user' },
      { status: 400 }
    )
  }
}

async function handleActivateUser(data: { userId: string }) {
  try {
    const user = await prisma.user.update({
      where: { id: data.userId },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        resource: 'USER',
        resourceId: user.id,
        details: { action: 'ACTIVATE' }
      }
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'User activated successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate user' },
      { status: 400 }
    )
  }
}

// Email verification handlers removed - users are automatically verified when created by admin
