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
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'SOLD' | 'FORECLOSED';
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
export async function getAllInvestments(): Promise<Investment[]> {
  const investments = await prisma.investment.findMany({
    include: {
      distributions: true,
      property: true,
      user: true
    }
  })
  
  return investments.map(inv => ({
    id: inv.id,
    name: inv.property?.name || 'Unknown Property',
    propertyAddress: inv.property?.address || 'Unknown Address',
    totalInvestment: inv.investmentAmount,
    investorId: inv.userId,
    investorEmail: inv.user?.email || 'Unknown',
    investmentAmount: inv.investmentAmount,
    ownershipPercentage: inv.ownershipPercentage || 0,
    startDate: inv.investmentDate.toISOString(),
    expectedReturn: 12.5, // Default value
    status: inv.status,
    distributions: inv.distributions.map(dist => ({
      id: dist.id,
      investmentId: dist.investmentId,
      amount: dist.amount,
      date: dist.distributionDate.toISOString(),
      type: dist.distributionType as any
    }))
  }))
}

export async function getInvestmentsByUser(userId: string): Promise<Investment[]> {
  const investments = await prisma.investment.findMany({
    where: { userId },
    include: {
      distributions: true,
      property: true,
      user: true
    }
  })
  
  return investments.map(inv => ({
    id: inv.id,
    name: inv.property?.name || 'Unknown Property',
    propertyAddress: inv.property?.address || 'Unknown Address',
    totalInvestment: inv.investmentAmount,
    investorId: inv.userId,
    investorEmail: inv.user?.email || 'Unknown',
    investmentAmount: inv.investmentAmount,
    ownershipPercentage: inv.ownershipPercentage || 0,
    startDate: inv.investmentDate.toISOString(),
    expectedReturn: 12.5, // Default value
    status: inv.status,
    distributions: inv.distributions.map(dist => ({
      id: dist.id,
      investmentId: dist.investmentId,
      amount: dist.amount,
      date: dist.distributionDate.toISOString(),
      type: dist.distributionType as any
    }))
  }))
}

export async function createInvestment(investmentData: Omit<Investment, 'id' | 'distributions'>): Promise<Investment> {
  // For now, create a simple investment record
  const investment = await prisma.investment.create({
    data: {
      userId: investmentData.investorId,
      propertyId: 'temp-property-id', // You'll need to create properties first
      investmentAmount: investmentData.investmentAmount,
      ownershipPercentage: investmentData.ownershipPercentage,
      status: investmentData.status as any
    },
    include: {
      distributions: true
    }
  })
  
  return {
    id: investment.id,
    name: investmentData.name,
    propertyAddress: investmentData.propertyAddress,
    totalInvestment: investmentData.totalInvestment,
    investorId: investment.userId,
    investorEmail: investmentData.investorEmail,
    investmentAmount: investment.investmentAmount,
    ownershipPercentage: investment.ownershipPercentage || 0,
    startDate: investment.investmentDate.toISOString(),
    expectedReturn: investmentData.expectedReturn,
    status: investment.status,
    distributions: []
  }
}

export async function updateInvestment(id: string, updates: Partial<Investment>): Promise<Investment | null> {
  try {
    const investment = await prisma.investment.update({
      where: { id },
      data: {
        investmentAmount: updates.investmentAmount,
        ownershipPercentage: updates.ownershipPercentage,
        status: updates.status as any
      },
      include: {
        distributions: true
      }
    })
    
    return {
      id: investment.id,
      name: 'Updated Property',
      propertyAddress: 'Updated Address',
      totalInvestment: investment.investmentAmount,
      investorId: investment.userId,
      investorEmail: 'updated@example.com',
      investmentAmount: investment.investmentAmount,
      ownershipPercentage: investment.ownershipPercentage || 0,
      startDate: investment.investmentDate.toISOString(),
      expectedReturn: 12.5,
      status: investment.status,
      distributions: []
    }
  } catch (error) {
    console.error('Error updating investment:', error)
    return null
  }
}

export async function deleteInvestment(id: string): Promise<boolean> {
  try {
    await prisma.investment.delete({
      where: { id }
    })
    return true
  } catch (error) {
    console.error('Error deleting investment:', error)
    return false
  }
}

export async function addDistribution(investmentId: string, distributionData: Omit<Distribution, 'id'>): Promise<Distribution> {
  const distribution = await prisma.distribution.create({
    data: {
      investmentId,
      userId: distributionData.investmentId, // This should be the user ID
      amount: distributionData.amount,
      distributionDate: new Date(distributionData.date),
      distributionType: distributionData.type as any
    }
  })
  
  return {
    id: distribution.id,
    investmentId: distribution.investmentId,
    amount: distribution.amount,
    date: distribution.distributionDate.toISOString(),
    type: distribution.distributionType as any
  }
} 