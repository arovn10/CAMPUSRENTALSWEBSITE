import { NextRequest } from 'next/server'

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

// In-memory storage (replace with real database in production)
let USERS: AuthenticatedUser[] = [
  {
    id: 'admin-1',
    email: 'rovnerproperties@gmail.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    company: 'Campus Rentals LLC',
    phone: '+1 (504) 383-4552',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  }
];

let INVESTMENTS: Investment[] = [];

// In-memory password storage (replace with real database in production)
let PASSWORDS: Record<string, string> = {
  'rovnerproperties@gmail.com': 'Celarev0319942002!'
};

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    console.log('Authenticating user...')
    
    // Check for query parameter or header authentication
    const authEmail = request.nextUrl.searchParams.get('auth') || 
                     request.headers.get('x-auth-email') ||
                     'investor1@example.com' // Default for demo
    
    console.log('Auth email:', authEmail)
    
    const user = USERS.find(u => u.email === authEmail)
    
    if (!user) {
      console.log('User not found for email:', authEmail)
      return null
    }
    
    console.log('User authenticated successfully:', user.email)
    return user
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function authenticateWithPassword(email: string, password: string): Promise<AuthenticatedUser | null> {
  try {
    const user = USERS.find(u => u.email === email)
    const storedPassword = PASSWORDS[email]
    
    if (!user || !storedPassword || storedPassword !== password) {
      return null
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString()
    
    return user
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

export function getAllUsers(): AuthenticatedUser[] {
  return USERS
}

export function createUser(userData: Omit<AuthenticatedUser, 'id' | 'createdAt' | 'lastLogin'>, password: string): AuthenticatedUser {
  const newUser: AuthenticatedUser = {
    ...userData,
    id: `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  }
  
  USERS.push(newUser)
  PASSWORDS[userData.email] = password
  return newUser
}

export function updateUser(id: string, updates: Partial<AuthenticatedUser>): AuthenticatedUser | null {
  const userIndex = USERS.findIndex(u => u.id === id)
  if (userIndex === -1) return null
  
  USERS[userIndex] = { ...USERS[userIndex], ...updates }
  return USERS[userIndex]
}

export function deleteUser(id: string): boolean {
  const userIndex = USERS.findIndex(u => u.id === id)
  if (userIndex === -1) return false
  
  const user = USERS[userIndex]
  delete PASSWORDS[user.email]
  USERS.splice(userIndex, 1)
  return true
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