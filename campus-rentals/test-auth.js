const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testAuth() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'rovnerproperties@gmail.com' }
    })
    
    if (!user) {
      console.log('❌ User not found in database')
      return
    }
    
    console.log('✅ User found in database:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.firstName} ${user.lastName}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Active: ${user.isActive}`)
    
    // Test password authentication
    const testPassword = 'Celarev0319942002!'
    const isValidPassword = await bcrypt.compare(testPassword, user.password)
    
    console.log(`🔐 Password test: ${isValidPassword ? '✅ Valid' : '❌ Invalid'}`)
    
    if (isValidPassword) {
      console.log('🎉 Authentication is working correctly!')
    } else {
      console.log('❌ Password authentication failed')
    }
    
  } catch (error) {
    console.error('❌ Error testing authentication:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuth() 