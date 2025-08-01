import { NextRequest } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'INVESTOR' | 'MANAGER'
}

// Mock user data for demonstration
const MOCK_USERS: AuthenticatedUser[] = [
  {
    id: 'admin-1',
    email: 'admin@campusrentalsllc.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  },
  {
    id: 'manager-1',
    email: 'manager@campusrentalsllc.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'MANAGER',
  },
  {
    id: 'investor-1',
    email: 'investor1@example.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'INVESTOR',
  },
  {
    id: 'investor-2',
    email: 'investor2@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'INVESTOR',
  },
]

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    console.log('Authenticating user...')
    
    // For demonstration, we'll use a simple query parameter or header
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