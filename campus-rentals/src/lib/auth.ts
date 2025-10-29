import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = '7d'
const BCRYPT_ROUNDS = 12

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  emailVerified: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
}

export interface PasswordResetData {
  email: string
}

export interface PasswordUpdateData {
  token: string
  password: string
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT utilities
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      emailVerified: user.emailVerified 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
      isActive: decoded.isActive,
      emailVerified: decoded.emailVerified
    }
  } catch (error) {
    return null
  }
}

// Token generation utilities
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Email verification token generation removed

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// User authentication functions
export async function authenticateUser(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | null> {
  const { email, password } = credentials

  // Find user
    const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
    })
    
    if (!user) {
      return null
    }
    
  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('Account is temporarily locked due to too many failed login attempts')
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated')
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password)
    
    if (!isValidPassword) {
    // Increment login attempts
    const loginAttempts = user.loginAttempts + 1
    const lockedUntil = loginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null // Lock for 15 minutes
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        loginAttempts,
        lockedUntil
      }
    })

    throw new Error('Invalid credentials')
  }

  // Reset login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      resource: 'USER',
      resourceId: user.id,
      details: { email: user.email }
    }
  })

  const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified
  }

  const token = generateToken(authUser)

  return { user: authUser, token }
}

export async function registerUser(data: RegisterData): Promise<{ user: AuthUser; token: string }> {
  const { email, password, firstName, lastName, company, phone } = data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create user (no email verification needed)
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      company,
      phone,
      role: 'INVESTOR',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      resource: 'USER',
      resourceId: user.id,
      details: { email: user.email, role: user.role }
    }
  })

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    emailVerified: true
  }

  const token = generateToken(authUser)

  return { user: authUser, token }
}

export async function requestPasswordReset(data: PasswordResetData): Promise<{ token: string }> {
  const { email } = data

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (!user) {
    // Don't reveal if user exists or not for security
    return { token: generatePasswordResetToken() }
  }

  // Generate reset token
  const resetToken = generatePasswordResetToken()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Store reset token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt
    }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'PASSWORD_CHANGE',
      resource: 'USER',
      resourceId: user.id,
      details: { email: user.email, type: 'RESET_REQUEST' }
    }
  })

  return { token: resetToken }
}

export async function resetPassword(data: PasswordUpdateData): Promise<boolean> {
  const { token, password } = data

  // Find valid reset token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token,
      used: false,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

  if (!resetToken) {
    throw new Error('Invalid or expired reset token')
  }

  // Hash new password
  const hashedPassword = await hashPassword(password)

  // Update user password
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { 
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      loginAttempts: 0,
      lockedUntil: null
    }
  })

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { used: true }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: resetToken.userId,
      action: 'PASSWORD_CHANGE',
      resource: 'USER',
      resourceId: resetToken.userId,
      details: { email: resetToken.user.email, type: 'RESET_COMPLETE' }
    }
  })

  return true
}

// Email verification removed - users are automatically verified when created by admin

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.password)
  if (!isValidPassword) {
    throw new Error('Current password is incorrect')
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword)

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PASSWORD_CHANGE',
      resource: 'USER',
      resourceId: userId,
      details: { email: user.email, type: 'CHANGE' }
    }
  })

  return true
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true
    }
  })

  if (!user) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified
  }
}

export async function createAdminUser(data: RegisterData): Promise<AuthUser> {
  const { email, password, firstName, lastName, company, phone } = data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      company,
      phone,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // Create audit log
  await prisma.auditLog.create({
      data: {
      userId: user.id,
      action: 'CREATE',
      resource: 'USER',
      resourceId: user.id,
      details: { email: user.email, role: 'ADMIN', createdBy: 'SYSTEM' }
      }
    })
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified
  }
}

export async function logoutUser(userId: string): Promise<void> {
  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'LOGOUT',
      resource: 'USER',
      resourceId: userId
    }
  })
}

// Middleware functions for API routes
export async function requireAuth(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

export async function requireAuthOrThrow(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export function hasPermission(user: AuthUser, requiredRole: string): boolean {
  const roleHierarchy = {
    'INVESTOR': 1,
    'MANAGER': 2,
    'ADMIN': 3
  }

  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

// Legacy functions for backward compatibility
export const authenticateWithPassword = authenticateUser
export const createUser = registerUser
export const getAllUsers = async () => {
  return await prisma.user.findMany({
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
      createdAt: true
    }
  })
}

export const updateUser = async (userId: string, data: any) => {
  return await prisma.user.update({
    where: { id: userId },
    data,
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
}

export const deleteUser = async (userId: string) => {
  return await prisma.user.delete({
    where: { id: userId }
  })
}