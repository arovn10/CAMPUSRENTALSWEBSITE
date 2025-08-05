const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Properties data based on the properties page
const PROPERTIES = [
  {
    propertyId: 1,
    name: '2422 Joseph St.',
    address: '2422 Joseph St, New Orleans, LA 70118',
    description: 'Beautiful 4-bedroom property near Tulane University',
    bedrooms: 4,
    bathrooms: 2,
    price: 5000,
    squareFeet: 1400,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 5000,
    currentValue: 385000
  },
  {
    propertyId: 2,
    name: '2424 Joseph St',
    address: '2424 Joseph St, New Orleans, LA 70115',
    description: 'Charming 3-bedroom property in great location',
    bedrooms: 3,
    bathrooms: 2,
    price: 4500,
    squareFeet: 1200,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4500,
    currentValue: 308000
  },
  {
    propertyId: 3,
    name: '7506 Zimple St',
    address: '7506 Zimple St, New Orleans, LA 70118',
    description: 'Spacious 4-bedroom property with modern amenities',
    bedrooms: 4,
    bathrooms: 2,
    price: 4800,
    squareFeet: 1350,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4800,
    currentValue: 352000
  },
  {
    propertyId: 4,
    name: '7700 Burthe St',
    address: '7700 Burthe St, New Orleans, LA 70118',
    description: 'Cozy 3-bedroom property with great rental potential',
    bedrooms: 3,
    bathrooms: 2,
    price: 4200,
    squareFeet: 1100,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4200,
    currentValue: 308000
  },
  {
    propertyId: 5,
    name: '1414 Audubon St',
    address: '1414 Audubon St, New Orleans, LA 70118',
    description: 'Large 4-bedroom property with excellent location',
    bedrooms: 4,
    bathrooms: 2,
    price: 5200,
    squareFeet: 1450,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 5200,
    currentValue: 462000
  },
  {
    propertyId: 6,
    name: '7506 Zimpel St',
    address: '7506 Zimpel St, New Orleans, LA 70118',
    description: 'Well-maintained 3-bedroom property',
    bedrooms: 3,
    bathrooms: 2,
    price: 4600,
    squareFeet: 1250,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4600,
    currentValue: 352000
  },
  {
    propertyId: 7,
    name: '460 NW 20th St',
    address: '460 NW 20th St, Boca Raton, FL 33496',
    description: 'Luxury 4-bedroom property in Florida',
    bedrooms: 4,
    bathrooms: 3,
    price: 6500,
    squareFeet: 1800,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 6500,
    currentValue: 638000
  },
  {
    propertyId: 8,
    name: '7900 Maple St',
    address: '7900 Maple St, New Orleans, LA 70118',
    description: 'Modern 3-bedroom property with updates',
    bedrooms: 3,
    bathrooms: 2,
    price: 4400,
    squareFeet: 1150,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4400,
    currentValue: 808500
  },
  {
    propertyId: 9,
    name: '7313-15 Freret St',
    address: '7313-15 Freret St, New Orleans, LA 70118',
    description: 'Large multi-unit property with great income potential',
    bedrooms: 6,
    bathrooms: 4,
    price: 8500,
    squareFeet: 2200,
    propertyType: 'MULTI_FAMILY',
    monthlyRent: 8500,
    currentValue: 990000
  },
  {
    propertyId: 10,
    name: '1128 Lowerline St',
    address: '1128 Lowerline St, New Orleans, LA 70118',
    description: 'Charming 4-bedroom property near campus',
    bedrooms: 4,
    bathrooms: 2,
    price: 4800,
    squareFeet: 1300,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4800,
    currentValue: 152585
  },
  {
    propertyId: 11,
    name: '7608 Zimpel St',
    address: '7608 Zimpel St, New Orleans, LA 70118',
    description: 'Solid 3-bedroom investment property',
    bedrooms: 3,
    bathrooms: 2,
    price: 4300,
    squareFeet: 1200,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4300,
    currentValue: 275000
  },
  {
    propertyId: 12,
    name: '7500 Zimpel St',
    address: '7500 Zimpel St, New Orleans, LA 70118',
    description: 'Well-located 4-bedroom property',
    bedrooms: 4,
    bathrooms: 2,
    price: 4700,
    squareFeet: 1350,
    propertyType: 'SINGLE_FAMILY',
    monthlyRent: 4700,
    currentValue: 330000
  }
]

// Investment data based on the spreadsheets provided
const INVESTMENTS = [
  {
    propertyName: '2422 Joseph St.',
    totalInvestment: 350000,
    currentValue: 385000,
    startDate: '2023-04-25',
    expectedReturn: 12,
    status: 'ACTIVE',
    distributions: [
      { amount: 42000, date: '2024-01-15', type: 'RENTAL_INCOME' },
      { amount: 38000, date: '2024-07-15', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7700 Burthe St',
    totalInvestment: 280000,
    currentValue: 308000,
    startDate: '2023-05-15',
    expectedReturn: 10,
    status: 'ACTIVE',
    distributions: [
      { amount: 35000, date: '2024-02-01', type: 'RENTAL_INCOME' },
      { amount: 32000, date: '2024-08-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '1414 Audubon St',
    totalInvestment: 420000,
    currentValue: 462000,
    startDate: '2023-06-10',
    expectedReturn: 11,
    status: 'ACTIVE',
    distributions: [
      { amount: 50000, date: '2024-03-01', type: 'RENTAL_INCOME' },
      { amount: 45000, date: '2024-09-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7506 Zimpel St',
    totalInvestment: 320000,
    currentValue: 352000,
    startDate: '2023-07-20',
    expectedReturn: 9,
    status: 'ACTIVE',
    distributions: [
      { amount: 38000, date: '2024-04-01', type: 'RENTAL_INCOME' },
      { amount: 35000, date: '2024-10-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '460 NW 20th St',
    totalInvestment: 580000,
    currentValue: 638000,
    startDate: '2023-08-15',
    expectedReturn: 13,
    status: 'ACTIVE',
    distributions: [
      { amount: 70000, date: '2024-05-01', type: 'RENTAL_INCOME' },
      { amount: 65000, date: '2024-11-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7900 Maple St',
    totalInvestment: 735000,
    currentValue: 808500,
    startDate: '2024-04-19',
    expectedReturn: 15,
    status: 'ACTIVE',
    distributions: [
      { amount: 85000, date: '2024-06-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7313-15 Freret St',
    totalInvestment: 900000,
    currentValue: 990000,
    startDate: '2024-08-15',
    expectedReturn: 14,
    status: 'ACTIVE',
    distributions: [
      { amount: 100000, date: '2024-09-30', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '1128 Lowerline St',
    totalInvestment: 138714,
    currentValue: 152585,
    startDate: '2024-10-11',
    expectedReturn: 12,
    status: 'ACTIVE',
    distributions: [
      { amount: 16000, date: '2024-11-19', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7608 Zimpel St',
    totalInvestment: 250000,
    currentValue: 275000,
    startDate: '2023-09-01',
    expectedReturn: 10,
    status: 'ACTIVE',
    distributions: [
      { amount: 30000, date: '2024-06-15', type: 'RENTAL_INCOME' },
      { amount: 28000, date: '2024-12-15', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7500 Zimpel St',
    totalInvestment: 300000,
    currentValue: 330000,
    startDate: '2023-10-01',
    expectedReturn: 11,
    status: 'ACTIVE',
    distributions: [
      { amount: 36000, date: '2024-07-01', type: 'RENTAL_INCOME' },
      { amount: 33000, date: '2025-01-01', type: 'RENTAL_INCOME' }
    ]
  }
]

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...')
    
    // Connect to database
    await prisma.$connect()
    console.log('✅ Connected to database')
    
    // Create Steven Rovner user
    console.log('👤 Creating Steven Rovner user...')
    const hashedPassword = await bcrypt.hash('15Saratoga!', 12)
    
    const stevenUser = await prisma.user.upsert({
      where: { email: 'srovner@dia-law.com' },
      update: {
        password: hashedPassword,
        firstName: 'Steven',
        lastName: 'Rovner',
        role: 'ADMIN',
        isActive: true
      },
      create: {
        email: 'srovner@dia-law.com',
        password: hashedPassword,
        firstName: 'Steven',
        lastName: 'Rovner',
        role: 'ADMIN',
        isActive: true
      }
    })
    
    console.log(`✅ Created Steven Rovner user: ${stevenUser.email}`)
    
    // First, create all properties
    console.log('🏠 Creating properties...')
    const createdProperties = []
    
    for (const property of PROPERTIES) {
      const createdProperty = await prisma.property.upsert({
        where: { propertyId: property.propertyId },
        update: {
          name: property.name,
          address: property.address,
          description: property.description,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          price: property.price,
          squareFeet: property.squareFeet,
          propertyType: property.propertyType,
          monthlyRent: property.monthlyRent,
          currentValue: property.currentValue
        },
        create: {
          propertyId: property.propertyId,
          name: property.name,
          address: property.address,
          description: property.description,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          price: property.price,
          squareFeet: property.squareFeet,
          propertyType: property.propertyType,
          monthlyRent: property.monthlyRent,
          currentValue: property.currentValue
        }
      })
      
      createdProperties.push(createdProperty)
      console.log(`✅ Created property: ${property.name}`)
    }
    
    // Create investments for each property
    console.log('💰 Creating investments...')
    
    for (const investment of INVESTMENTS) {
      const property = createdProperties.find(p => p.name === investment.propertyName)
      if (!property) {
        console.log(`⚠️ Property not found: ${investment.propertyName}`)
        continue
      }
      
      // Create the investment
      const createdInvestment = await prisma.investment.create({
        data: {
          userId: stevenUser.id,
          propertyId: property.id,
          investmentAmount: investment.totalInvestment,
          ownershipPercentage: 100, // Steven owns 100% of each property
          status: investment.status
        }
      })
      
      console.log(`✅ Created investment: ${investment.propertyName} - $${investment.totalInvestment.toLocaleString()}`)
      
      // Create distributions for this investment
      for (const distribution of investment.distributions) {
        await prisma.distribution.create({
          data: {
            investmentId: createdInvestment.id,
            userId: stevenUser.id,
            amount: distribution.amount,
            distributionDate: new Date(distribution.date),
            distributionType: distribution.type
          }
        })
      }
      
      console.log(`  📊 Added ${investment.distributions.length} distributions`)
    }
    
    // Create some additional investments for other properties
    const remainingProperties = createdProperties.filter(p => !INVESTMENTS.find(i => i.propertyName === p.name))
    
    for (const property of remainingProperties) {
      const estimatedValue = property.price * 12 * 10 // 10 years of rent as rough estimate
      const investmentAmount = estimatedValue * 0.8 // 80% LTV
      
      await prisma.investment.create({
        data: {
          userId: stevenUser.id,
          propertyId: property.id,
          investmentAmount: Math.round(investmentAmount),
          ownershipPercentage: 100,
          status: 'ACTIVE'
        }
      })
      
      console.log(`✅ Created additional investment: ${property.name} - $${Math.round(investmentAmount).toLocaleString()}`)
    }
    
    // Calculate total portfolio value
    const allInvestments = await prisma.investment.findMany({
      where: { userId: stevenUser.id },
      include: { property: true }
    })
    
    const totalInvested = allInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0)
    const totalCurrentValue = allInvestments.reduce((sum, inv) => sum + (inv.property.currentValue || inv.investmentAmount * 1.1), 0)
    
    console.log('\n📊 Portfolio Summary:')
    console.log(`   Total Properties: ${allInvestments.length}`)
    console.log(`   Total Invested: $${totalInvested.toLocaleString()}`)
    console.log(`   Estimated Current Value: $${Math.round(totalCurrentValue).toLocaleString()}`)
    console.log(`   Total Return: $${Math.round(totalCurrentValue - totalInvested).toLocaleString()}`)
    console.log(`   Average IRR: ${((totalCurrentValue / totalInvested - 1) * 100).toFixed(1)}%`)
    
    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n🔐 Login Credentials:')
    console.log(`   Email: srovner@dia-law.com`)
    console.log(`   Password: 15Saratoga!`)
    console.log(`   Role: ADMIN`)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase() 