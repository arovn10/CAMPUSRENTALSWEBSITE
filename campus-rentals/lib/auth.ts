import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'INVESTOR' | 'MANAGER'
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // For now, we'll use a simple session-based approach
    // In production, you'd want to implement proper JWT or session management
    
    const authHeader = request.headers.get('authorization')
    const sessionToken = request.cookies.get('session_token')?.value
    
    if (!authHeader && !sessionToken) {
      return null
    }
    
    // Extract user ID from header or session
    let userId: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Simple token-based auth (replace with proper JWT validation)
      userId = authHeader.substring(7)
    } else if (sessionToken) {
      // Session-based auth (replace with proper session validation)
      userId = sessionToken
    }
    
    if (!userId) {
      return null
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    })
    
    if (!user || !user.isActive) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await authenticateUser(request)
  
  if (!user) {
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