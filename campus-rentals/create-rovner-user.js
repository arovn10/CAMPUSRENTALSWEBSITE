const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createRovnerUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('Celarev0319942002!', 12)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'rovnerproperties@gmail.com' }
    })
    
    if (existingUser) {
      // Update the existing user with the new password
      await prisma.user.update({
        where: { email: 'rovnerproperties@gmail.com' },
        data: {
          password: hashedPassword,
          firstName: 'Rovner',
          lastName: 'Properties',
          role: 'ADMIN',
          isActive: true,
          updatedAt: new Date()
        }
      })
      console.log('✅ Updated existing rovnerproperties@gmail.com user with new password')
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          email: 'rovnerproperties@gmail.com',
          password: hashedPassword,
          firstName: 'Rovner',
          lastName: 'Properties',
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log('✅ Created new rovnerproperties@gmail.com user')
    }
    
    console.log('🎉 Rovner Properties user is ready for login!')
    console.log('Email: rovnerproperties@gmail.com')
    console.log('Password: Celarev0319942002!')
    
  } catch (error) {
    console.error('❌ Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createRovnerUser() 