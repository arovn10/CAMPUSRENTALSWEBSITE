const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUser() {
  try {
    console.log('🔍 Connecting to database...')
    await prisma.$connect()
    
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash('Celarev0319942002!', 12)
    
    console.log('👤 Creating/updating user...')
    const user = await prisma.user.upsert({
      where: { email: 'rovnerproperties@gmail.com' },
      update: {
        password: hashedPassword,
        firstName: 'Rovner',
        lastName: 'Properties',
        role: 'ADMIN',
        isActive: true
      },
      create: {
        email: 'rovnerproperties@gmail.com',
        password: hashedPassword,
        firstName: 'Rovner',
        lastName: 'Properties',
        role: 'ADMIN',
        isActive: true
      }
    })
    
    console.log('✅ User created/updated successfully!')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.firstName} ${user.lastName}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Active: ${user.isActive}`)
    
  } catch (error) {
    console.error('❌ Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser() 