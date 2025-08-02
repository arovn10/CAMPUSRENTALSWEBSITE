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

// Enhanced user data with admin account
const MOCK_USERS: AuthenticatedUser[] = [
  {
    id: 'admin-1',
    email: 'rovnerproperties@gmail.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    company: 'Campus Rentals LLC',
    phone: '+1 (555) 123-4567',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'manager-1',
    email: 'manager@campusrentalsllc.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'MANAGER',
    company: 'Campus Rentals LLC',
    phone: '+1 (555) 234-5678',
    createdAt: '2024-01-15T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'investor-1',
    email: 'investor1@example.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'INVESTOR',
    company: 'Smith Investments',
    phone: '+1 (555) 345-6789',
    createdAt: '2024-02-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'investor-2',
    email: 'investor2@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'INVESTOR',
    company: 'Doe Capital',
    phone: '+1 (555) 456-7890',
    createdAt: '2024-02-15T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
]

// Simple password verification (in production, use bcrypt)
const PASSWORDS: Record<string, string> = {
  'rovnerproperties@gmail.com': 'Celarev0319942002!',
  'manager@campusrentalsllc.com': 'manager123',
  'investor1@example.com': 'investor123',
  'investor2@example.com': 'investor456',
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    console.log('Authenticating user...')
    
    // Check for query parameter or header authentication
    const authEmail = request.nextUrl.searchParams.get('auth') || 
                     request.headers.get('x-auth-email') ||
                     'investor1@example.com' // Default for demo
    
    console.log('Auth email:', authEmail)
    
    const user = MOCK_USERS.find(u => u.email === authEmail)
    
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
    const user = MOCK_USERS.find(u => u.email === email)
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
  return MOCK_USERS
}

export function createUser(userData: Omit<AuthenticatedUser, 'id' | 'createdAt' | 'lastLogin'>): AuthenticatedUser {
  const newUser: AuthenticatedUser = {
    ...userData,
    id: `user-${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  }
  
  MOCK_USERS.push(newUser)
  return newUser
}

export function updateUser(id: string, updates: Partial<AuthenticatedUser>): AuthenticatedUser | null {
  const userIndex = MOCK_USERS.findIndex(u => u.id === id)
  if (userIndex === -1) return null
  
  MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...updates }
  return MOCK_USERS[userIndex]
}

export function deleteUser(id: string): boolean {
  const userIndex = MOCK_USERS.findIndex(u => u.id === id)
  if (userIndex === -1) return false
  
  MOCK_USERS.splice(userIndex, 1)
  return true
} 