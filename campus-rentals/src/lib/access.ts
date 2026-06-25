import { prisma } from './prisma'

export interface AccessUser {
  id: string
  email: string
  role: string
}

/**
 * Property-scoped read authorization.
 *
 * ADMIN/MANAGER may read any property. Otherwise the caller must have a real
 * stake in the property: a direct investment, ownership of an entity that
 * invested in it (global or per-deal owner), an explicit access grant, or be a
 * deal follower. Mirrors the check already used in properties/[id]/files.
 */
export async function canAccessProperty(user: AccessUser, propertyId: string): Promise<boolean> {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return true
  if (!propertyId) return false

  const [investment, entityInvestment, access, follower] = await Promise.all([
    prisma.investment.findFirst({
      where: { userId: user.id, propertyId },
      select: { id: true },
    }),
    prisma.entityInvestment.findFirst({
      where: {
        propertyId,
        OR: [
          { entity: { entityOwners: { some: { userId: user.id } } } },
          { entityInvestmentOwners: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    }),
    prisma.userPropertyAccess.findFirst({
      where: { userId: user.id, propertyId },
      select: { id: true },
    }),
    prisma.dealFollower.findFirst({
      where: {
        propertyId,
        OR: [{ userId: user.id }, { contact: { email: user.email } }],
      },
      select: { id: true },
    }),
  ])

  return !!(investment || entityInvestment || access || follower)
}
