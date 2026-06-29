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

export interface AccessDoc {
  id: string
  entityType: string
  entityId: string
  uploadedBy: string
  isPublic: boolean
  visibleToInvestor: boolean
}

/**
 * Document-scoped read authorization (data rooms + per-investor routing).
 *
 * ADMIN/MANAGER may read anything. An investor may read a document when:
 *  - they uploaded it, OR
 *  - it is investor-visible AND it is attached to a PROPERTY they can access
 *    (canAccessProperty), OR
 *  - they hold an explicit DocumentAccess grant (auto-routing for K-1s/statements
 *    that aren't tied to a property the investor owns).
 *
 * Returns false for non-investor-visible docs to non-staff regardless of grants
 * unless the grant is explicit (a grant is itself the routing decision).
 */
export async function canAccessDocument(user: AccessUser, doc: AccessDoc): Promise<boolean> {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return true
  if (doc.uploadedBy === user.id) return true

  // Explicit per-investor grant — the routing decision itself.
  const grant = await prisma.documentAccess.findUnique({
    where: { documentId_userId: { documentId: doc.id, userId: user.id } },
    select: { id: true },
  })
  if (grant) return true

  // Otherwise must be investor-visible AND attached to a property they can access.
  if (!doc.isPublic || !doc.visibleToInvestor) return false
  if (doc.entityType === 'PROPERTY') {
    return canAccessProperty(user, doc.entityId)
  }
  return false
}
