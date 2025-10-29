const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAdminUser() {
  try {
    const user = await prisma.user.update({
      where: { email: 'rovnerproperties@gmail.com' },
      data: {
        role: 'ADMIN',
        emailVerified: true,
        isActive: true
      }
    })
    console.log('User updated successfully:', {
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified
    })
  } catch (error) {
    console.error('Error updating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminUser()

