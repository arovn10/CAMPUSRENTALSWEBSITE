import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'INVESTOR' | 'MANAGER'
  company?: string
  phone?: string
  createdAt: string
  lastLogin: string
}

// Investment interfaces
export interface Investment {
  id: string;
  name: string;
  propertyAddress: string;
  totalInvestment: number;
  investorId: string;
  investorEmail: string;
  investmentAmount: number;
  ownershipPercentage: number;
  startDate: string;
  expectedReturn: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  distributions: Distribution[];
}

export interface Distribution {
  id: string;
  investmentId: string;
  amount: number;
  date: string;
  type: 'RENTAL' | 'SALE' | 'REFINANCE';
}

// Initialize admin user if not exists
async function initializeAdminUser() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'rovnerproperties@gmail.com' }
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Celarev0319942002!', 12)
      await prisma.user.create({
        data: {
          email: 'rovnerproperties@gmail.com',
          firstName: 'Admin',
          lastName: 'User',
          password: hashedPassword,
          role: 'ADMIN',
          company: 'Campus Rentals LLC',
          phone: '+1 (504) 383-4552'
        }
      })
      console.log('Admin user created successfully')
    }
  } catch (error) {
    console.error('Error initializing admin user:', error)
  }
}

// Initialize admin user on module load
initializeAdminUser()

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    console.log('Authenticating user...')
    
    // Check for query parameter or header authentication
    const authEmail = request.nextUrl.searchParams.get('auth') || 
                     request.headers.get('x-auth-email')
    
    if (!authEmail) {
      console.log('No auth email provided')
      return null
    }
    
    console.log('Auth email:', authEmail)
    
    const user = await prisma.user.findUnique({
      where: { email: authEmail, isActive: true }
    })
    
    if (!user) {
      console.log('User not found for email:', authEmail)
      return null
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    })
    
    console.log('User authenticated successfully:', user.email)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      company: user.company || undefined,
      phone: user.phone || undefined,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function authenticateWithPassword(email: string, password: string): Promise<AuthenticatedUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true }
    })
    
    if (!user) {
      return null
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      return null
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    })
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      company: user.company || undefined,
      phone: user.phone || undefined,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Password authentication error:', error)
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await authenticateUser(request)
  
  if (!user) {
    console.log('Authentication required but no user found')
    throw new Error('Authentication required')
  }
  
  return user
}

export function hasPermission(user: AuthenticatedUser, requiredRole: 'ADMIN' | 'MANAGER' | 'INVESTOR'): boolean {
  const roleHierarchy = {
    ADMIN: 3,
    MANAGER: 2,
    INVESTOR: 1,
  }
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

export async function getAllUsers(): Promise<AuthenticatedUser[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
  
  return users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    company: user.company || undefined,
    phone: user.phone || undefined,
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.updatedAt.toISOString()
  }))
}

export async function createUser(userData: Omit<AuthenticatedUser, 'id' | 'createdAt' | 'lastLogin'>, password: string): Promise<AuthenticatedUser> {
  const hashedPassword = await bcrypt.hash(password, 12)
  
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: hashedPassword,
      role: userData.role,
      company: userData.company,
      phone: userData.phone
    }
  })
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    company: user.company || undefined,
    phone: user.phone || undefined,
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.updatedAt.toISOString()
  }
}

export async function updateUser(id: string, updates: Partial<AuthenticatedUser>): Promise<AuthenticatedUser | null> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName: updates.firstName,
        lastName: updates.lastName,
        role: updates.role,
        company: updates.company,
        phone: updates.phone
      }
    })
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      company: user.company || undefined,
      phone: user.phone || undefined,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Error updating user:', error)
    return null
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })
    return true
  } catch (error) {
    console.error('Error deleting user:', error)
    return false
  }
}

// Investment management functions
export function getAllInvestments(): Investment[] {
  return INVESTMENTS
}

export function getInvestmentsByUser(userId: string): Investment[] {
  return INVESTMENTS.filter(inv => inv.investorId === userId)
}

export function createInvestment(investmentData: Omit<Investment, 'id' | 'distributions'>): Investment {
  const newInvestment: Investment = {
    ...investmentData,
    id: `inv-${Date.now()}`,
    distributions: []
  }
  
  INVESTMENTS.push(newInvestment)
  return newInvestment
}

export function updateInvestment(id: string, updates: Partial<Investment>): Investment | null {
  const investmentIndex = INVESTMENTS.findIndex(inv => inv.id === id)
  if (investmentIndex === -1) return null
  
  INVESTMENTS[investmentIndex] = { ...INVESTMENTS[investmentIndex], ...updates }
  return INVESTMENTS[investmentIndex]
}

export function deleteInvestment(id: string): boolean {
  const investmentIndex = INVESTMENTS.findIndex(inv => inv.id === id)
  if (investmentIndex === -1) return false
  
  INVESTMENTS.splice(investmentIndex, 1)
  return true
}

export function addDistribution(investmentId: string, distributionData: Omit<Distribution, 'id'>): Distribution {
  const distribution: Distribution = {
    ...distributionData,
    id: `dist-${Date.now()}`
  }
  
  const investment = INVESTMENTS.find(inv => inv.id === investmentId)
  if (investment) {
    investment.distributions.push(distribution)
  }
  
  return distribution
} 