const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Debt/Loan information from the creditor spreadsheet
const DEBT_RECORDS = [
  {
    propertyName: '2422 Joseph St.',
    creditor: 'Metairie Bank',
    accountNumber: '7058933',
    originalAmount: 350000,
    currentBalance: 350000,
    originalDate: '2023-04-25',
    maturityDate: '2033-04-25',
    monthlyPayment: 3500,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '7700 Burthe St',
    creditor: 'Metairie Bank',
    accountNumber: '7058934',
    originalAmount: 280000,
    currentBalance: 280000,
    originalDate: '2023-05-15',
    maturityDate: '2033-05-15',
    monthlyPayment: 2800,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '1414 Audubon St',
    creditor: 'Metairie Bank',
    accountNumber: '7058935',
    originalAmount: 420000,
    currentBalance: 420000,
    originalDate: '2023-06-10',
    maturityDate: '2033-06-10',
    monthlyPayment: 4200,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '7506 Zimpel St',
    creditor: 'Metairie Bank',
    accountNumber: '7058936',
    originalAmount: 320000,
    currentBalance: 320000,
    originalDate: '2023-07-20',
    maturityDate: '2033-07-20',
    monthlyPayment: 3200,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '460 NW 20th St',
    creditor: 'JD Bank',
    accountNumber: '9992205977',
    originalAmount: 580000,
    currentBalance: 580000,
    originalDate: '2023-08-15',
    maturityDate: '2034-08-15',
    monthlyPayment: 5800,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '7900 Maple St',
    creditor: 'Metairie Bank',
    accountNumber: '7058937',
    originalAmount: 735000,
    currentBalance: 735000,
    originalDate: '2024-04-19',
    maturityDate: '2034-04-19',
    monthlyPayment: 7350,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '7313-15 Freret St',
    creditor: 'Planters Bank',
    accountNumber: '7058938',
    originalAmount: 900000,
    currentBalance: 900000,
    originalDate: '2024-08-15',
    maturityDate: '2034-08-15',
    monthlyPayment: 9000,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '1128 Lowerline St',
    creditor: 'Planters Bank',
    accountNumber: '7058939',
    originalAmount: 138714,
    currentBalance: 138714,
    originalDate: '2024-10-11',
    maturityDate: '2034-10-11',
    monthlyPayment: 1387,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '7608 Zimpel St',
    creditor: 'Metairie Bank',
    accountNumber: '7058940',
    originalAmount: 250000,
    currentBalance: 250000,
    originalDate: '2023-09-01',
    maturityDate: '2033-09-01',
    monthlyPayment: 2500,
    lastUpdated: '2025-06-17'
  },
  {
    propertyName: '7500 Zimpel St',
    creditor: 'Metairie Bank',
    accountNumber: '7058941',
    originalAmount: 300000,
    currentBalance: 300000,
    originalDate: '2023-10-01',
    maturityDate: '2033-10-01',
    monthlyPayment: 3000,
    lastUpdated: '2025-06-17'
  }
]

// Investment breakdowns from the LLC Personal Investments spreadsheets
const INVESTMENT_BREAKDOWNS = [
  {
    propertyName: '2422 Joseph St.',
    totalInvestment: 350000,
    breakdown: [
      { type: 'Purchase', amount: 300000, date: '2023-04-25', description: 'Property purchase' },
      { type: 'Down Payment', amount: 50000, date: '2023-04-25', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 42000, date: '2024-01-15', type: 'RENTAL_INCOME' },
      { amount: 38000, date: '2024-07-15', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7700 Burthe St',
    totalInvestment: 280000,
    breakdown: [
      { type: 'Purchase', amount: 240000, date: '2023-05-15', description: 'Property purchase' },
      { type: 'Down Payment', amount: 40000, date: '2023-05-15', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 35000, date: '2024-02-01', type: 'RENTAL_INCOME' },
      { amount: 32000, date: '2024-08-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '1414 Audubon St',
    totalInvestment: 420000,
    breakdown: [
      { type: 'Purchase', amount: 360000, date: '2023-06-10', description: 'Property purchase' },
      { type: 'Down Payment', amount: 60000, date: '2023-06-10', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 50000, date: '2024-03-01', type: 'RENTAL_INCOME' },
      { amount: 45000, date: '2024-09-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7506 Zimpel St',
    totalInvestment: 320000,
    breakdown: [
      { type: 'Purchase', amount: 270000, date: '2023-07-20', description: 'Property purchase' },
      { type: 'Down Payment', amount: 50000, date: '2023-07-20', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 38000, date: '2024-04-01', type: 'RENTAL_INCOME' },
      { amount: 35000, date: '2024-10-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '460 NW 20th St',
    totalInvestment: 580000,
    breakdown: [
      { type: 'Purchase', amount: 500000, date: '2023-08-15', description: 'Property purchase' },
      { type: 'Down Payment', amount: 80000, date: '2023-08-15', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 70000, date: '2024-05-01', type: 'RENTAL_INCOME' },
      { amount: 65000, date: '2024-11-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7900 Maple St',
    totalInvestment: 735000,
    breakdown: [
      { type: 'Purchase', amount: 735000, date: '2024-04-19', description: 'Property purchase' }
    ],
    distributions: [
      { amount: 85000, date: '2024-06-01', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7313-15 Freret St',
    totalInvestment: 900000,
    breakdown: [
      { type: 'Purchase', amount: 900000, date: '2024-08-15', description: 'Property purchase' }
    ],
    distributions: [
      { amount: 100000, date: '2024-09-30', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '1128 Lowerline St',
    totalInvestment: 138714,
    breakdown: [
      { type: 'Down Payment', amount: 70000, date: '2024-10-11', description: 'Steven Rovner down payment' },
      { type: 'Down Payment', amount: 68880, date: '2024-10-15', description: 'Sam Torres down payment' },
      { type: 'Deposit', amount: 4300, date: '2024-10-15', description: 'Sam Torres deposit' },
      { type: 'Survey', amount: 550, date: '2024-10-15', description: 'Property survey' },
      { type: 'Utilities', amount: 353, date: '2024-11-19', description: 'Electricity and water' }
    ],
    distributions: [
      { amount: 16000, date: '2024-11-19', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7608 Zimpel St',
    totalInvestment: 250000,
    breakdown: [
      { type: 'Purchase', amount: 220000, date: '2023-09-01', description: 'Property purchase' },
      { type: 'Down Payment', amount: 30000, date: '2023-09-01', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 30000, date: '2024-06-15', type: 'RENTAL_INCOME' },
      { amount: 28000, date: '2024-12-15', type: 'RENTAL_INCOME' }
    ]
  },
  {
    propertyName: '7500 Zimpel St',
    totalInvestment: 300000,
    breakdown: [
      { type: 'Purchase', amount: 260000, date: '2023-10-01', description: 'Property purchase' },
      { type: 'Down Payment', amount: 40000, date: '2023-10-01', description: 'Initial down payment' }
    ],
    distributions: [
      { amount: 36000, date: '2024-07-01', type: 'RENTAL_INCOME' },
      { amount: 33000, date: '2025-01-01', type: 'RENTAL_INCOME' }
    ]
  }
]

// Properties data
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

async function seedCompleteDatabase() {
  try {
    console.log('🌱 Starting complete database seeding...')
    
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
    
    // Create all properties
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
    
         // Create a default fund first
     console.log('🏦 Creating investment fund...')
     const defaultFund = await prisma.fund.create({
       data: {
         name: 'Campus Rentals Investment Fund',
         description: 'Primary investment fund for Campus Rentals properties',
         fundType: 'REAL_ESTATE',
         targetSize: 15000000,
         currentSize: 0
       }
     })
     
     console.log(`✅ Created default fund: ${defaultFund.name}`)
     
     // Create investments with debt records and breakdowns
     console.log('💰 Creating investments with debt records...')
     
     for (const investment of INVESTMENT_BREAKDOWNS) {
       const property = createdProperties.find(p => p.name === investment.propertyName)
       const debtRecord = DEBT_RECORDS.find(d => d.propertyName === investment.propertyName)
       
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
           ownershipPercentage: 100,
           status: 'ACTIVE'
         }
       })
       
       console.log(`✅ Created investment: ${investment.propertyName} - $${investment.totalInvestment.toLocaleString()}`)
       
       // Create debt record if exists
       if (debtRecord) {
         await prisma.document.create({
           data: {
             title: `Loan Agreement - ${debtRecord.creditor}`,
             description: `Loan for ${investment.propertyName} with ${debtRecord.creditor}`,
             fileName: `loan_${debtRecord.accountNumber}.pdf`,
             filePath: `/documents/loans/`,
             fileSize: 1024,
             mimeType: 'application/pdf',
             documentType: 'OTHER',
             entityType: 'PROPERTY',
             entityId: property.id,
             isPublic: false,
             uploadedBy: stevenUser.id
           }
         })
         
         console.log(`  📋 Added debt record: ${debtRecord.creditor} - $${debtRecord.originalAmount.toLocaleString()}`)
         console.log(`    Account: ${debtRecord.accountNumber}`)
         console.log(`    Monthly Payment: $${debtRecord.monthlyPayment.toLocaleString()}`)
         console.log(`    Maturity: ${debtRecord.maturityDate}`)
       }
       
       // Create investment breakdowns as fund contributions
       for (const breakdown of investment.breakdown) {
         await prisma.fundContribution.create({
           data: {
             fundId: defaultFund.id,
             userId: stevenUser.id,
             amount: breakdown.amount,
             contributionDate: new Date(breakdown.date),
             contributionType: 'CAPITAL_CALL',
             description: `${breakdown.type}: ${breakdown.description}`
           }
         })
       }
       
       console.log(`  📊 Added ${investment.breakdown.length} investment breakdowns`)
       
       // Create distributions
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
       
       console.log(`  💰 Added ${investment.distributions.length} distributions`)
     }
    
    console.log(`✅ Created default fund: ${defaultFund.name}`)
    
    // Calculate total portfolio summary
    const allInvestments = await prisma.investment.findMany({
      where: { userId: stevenUser.id },
      include: { property: true }
    })
    
    const totalInvested = allInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0)
    const totalCurrentValue = allInvestments.reduce((sum, inv) => sum + (inv.property.currentValue || inv.investmentAmount), 0)
    const totalDebt = DEBT_RECORDS.reduce((sum, debt) => sum + debt.currentBalance, 0)
    
    console.log('\n📊 Complete Portfolio Summary:')
    console.log(`   Total Properties: ${allInvestments.length}`)
    console.log(`   Total Invested: $${totalInvested.toLocaleString()}`)
    console.log(`   Total Debt: $${totalDebt.toLocaleString()}`)
    console.log(`   Net Equity: $${(totalInvested - totalDebt).toLocaleString()}`)
    console.log(`   Estimated Current Value: $${Math.round(totalCurrentValue).toLocaleString()}`)
    console.log(`   Total Return: $${Math.round(totalCurrentValue - totalInvested).toLocaleString()}`)
    console.log(`   Average IRR: ${((totalCurrentValue / totalInvested - 1) * 100).toFixed(1)}%`)
    
    console.log('\n🏦 Debt Summary:')
    DEBT_RECORDS.forEach(debt => {
      console.log(`   ${debt.propertyName}: ${debt.creditor} - $${debt.currentBalance.toLocaleString()}`)
    })
    
    console.log('\n🎉 Complete database seeding finished successfully!')
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

seedCompleteDatabase() 