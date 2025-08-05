const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing user roles and recreating database...')

  // Clear existing data first
  console.log('🗑️ Clearing existing data...')
  await prisma.distribution.deleteMany()
  await prisma.fundContribution.deleteMany()
  await prisma.fundDistribution.deleteMany()
  await prisma.fundInvestment.deleteMany()
  await prisma.investment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.document.deleteMany()
  await prisma.property.deleteMany()
  await prisma.fund.deleteMany()
  await prisma.user.deleteMany()

  // Create users with CORRECT roles
  const users = await Promise.all([
    // Alec Rovner - ADMIN
    prisma.user.create({
      data: {
        email: 'rovnerproperties@gmail.com',
        firstName: 'Alec',
        lastName: 'Rovner',
        password: await bcrypt.hash('Celarev0319942002!', 10),
        role: 'ADMIN',
        company: 'Campus Rentals LLC',
        phone: '(555) 987-6543'
      }
    }),
    // Steven Rovner - INVESTOR
    prisma.user.create({
      data: {
        email: 'srovner@dial-law.com',
        firstName: 'Steven',
        lastName: 'Rovner',
        password: await bcrypt.hash('15Saratoga!', 10),
        role: 'INVESTOR',
        company: 'Campus Rentals LLC',
        phone: '(504) 383-4552'
      }
    }),
    // Sam Torres - INVESTOR
    prisma.user.create({
      data: {
        email: 'torres.samd@gmail.com',
        firstName: 'Sam',
        lastName: 'Torres',
        password: await bcrypt.hash('password123', 10),
        role: 'INVESTOR',
        company: 'Campus Rentals LLC',
        phone: '(555) 123-4567'
      }
    })
  ])

  console.log('✅ Users created with correct roles')
  console.log('👑 Admin: Alec Rovner (rovnerproperties@gmail.com)')
  console.log('💰 Investor: Steven Rovner (srovner@dial-law.com)')
  console.log('💰 Investor: Sam Torres (torres.samd@gmail.com)')

  // Create properties with debt information
  const properties = await Promise.all([
    // 7700 Burthe St
    prisma.property.create({
      data: {
        propertyId: 1,
        name: '7700 Burthe St',
        address: '7700 Burthe St, New Orleans, LA 70118',
        description: 'Student housing property with Metairie Bank financing',
        bedrooms: 4,
        bathrooms: 2,
        price: 860000,
        squareFeet: 1800,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2023-04-25'),
        acquisitionPrice: 860000,
        currentValue: 900000,
        occupancyRate: 100,
        monthlyRent: 4500,
        annualExpenses: 15000,
        capRate: 6.0
      }
    }),
    // 2422 Joseph St
    prisma.property.create({
      data: {
        propertyId: 2,
        name: '2422 Joseph St',
        address: '2422 Joseph St, New Orleans, LA 70115',
        description: 'Student housing property with multiple Metairie Bank loans',
        bedrooms: 4,
        bathrooms: 2,
        price: 740953,
        squareFeet: 1600,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2023-04-25'),
        acquisitionPrice: 740953,
        currentValue: 800000,
        occupancyRate: 100,
        monthlyRent: 5000,
        annualExpenses: 18000,
        capRate: 6.5
      }
    }),
    // 7608 Zimple St
    prisma.property.create({
      data: {
        propertyId: 3,
        name: '7608 Zimple St',
        address: '7608 Zimple St, New Orleans, LA 70118',
        description: 'Student housing property with Metairie Bank financing',
        bedrooms: 3,
        bathrooms: 2,
        price: 442500,
        squareFeet: 1400,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2023-04-25'),
        acquisitionPrice: 442500,
        currentValue: 480000,
        occupancyRate: 100,
        monthlyRent: 3500,
        annualExpenses: 12000,
        capRate: 6.0
      }
    }),
    // 7500 Zimple St
    prisma.property.create({
      data: {
        propertyId: 4,
        name: '7500 Zimple St',
        address: '7500 Zimple St, New Orleans, LA 70118',
        description: 'Student housing property with Metairie Bank financing',
        bedrooms: 4,
        bathrooms: 2,
        price: 832000,
        squareFeet: 1800,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2023-06-23'),
        acquisitionPrice: 832000,
        currentValue: 900000,
        occupancyRate: 100,
        monthlyRent: 5500,
        annualExpenses: 20000,
        capRate: 6.5
      }
    }),
    // 7506 Zimple St
    prisma.property.create({
      data: {
        propertyId: 5,
        name: '7506 Zimple St',
        address: '7506 Zimple St, New Orleans, LA 70118',
        description: 'Student housing property with Metairie Bank financing',
        bedrooms: 4,
        bathrooms: 2,
        price: 577600,
        squareFeet: 1600,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2023-12-15'),
        acquisitionPrice: 577600,
        currentValue: 620000,
        occupancyRate: 100,
        monthlyRent: 4200,
        annualExpenses: 15000,
        capRate: 6.0
      }
    }),
    // 1414 Audubon St
    prisma.property.create({
      data: {
        propertyId: 6,
        name: '1414 Audubon St',
        address: '1414 Audubon St, New Orleans, LA 70118',
        description: 'Student housing property with multiple Metairie Bank loans',
        bedrooms: 4,
        bathrooms: 2,
        price: 772714,
        squareFeet: 1700,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2023-10-30'),
        acquisitionPrice: 772714,
        currentValue: 850000,
        occupancyRate: 100,
        monthlyRent: 5200,
        annualExpenses: 18000,
        capRate: 6.5
      }
    }),
    // 460 NW 20th St
    prisma.property.create({
      data: {
        propertyId: 7,
        name: '460 NW 20th St',
        address: '460 NW 20th St, Boca Raton, FL 33496',
        description: 'Student housing property with JD Bank financing',
        bedrooms: 3,
        bathrooms: 2,
        price: 198000,
        squareFeet: 1200,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2024-01-29'),
        acquisitionPrice: 198000,
        currentValue: 220000,
        occupancyRate: 100,
        monthlyRent: 2800,
        annualExpenses: 8000,
        capRate: 7.0
      }
    }),
    // 7313-15 Freret St
    prisma.property.create({
      data: {
        propertyId: 8,
        name: '7313-15 Freret St',
        address: '7313-15 Freret St, New Orleans, LA',
        description: 'Student housing property with Planters Bank financing',
        bedrooms: 6,
        bathrooms: 3,
        price: 847556,
        squareFeet: 2400,
        propertyType: 'MULTI_FAMILY',
        acquisitionDate: new Date('2024-09-27'),
        acquisitionPrice: 847556,
        currentValue: 950000,
        occupancyRate: 100,
        monthlyRent: 7200,
        annualExpenses: 25000,
        capRate: 6.0
      }
    }),
    // 1128 Lowerline St
    prisma.property.create({
      data: {
        propertyId: 9,
        name: '1128 Lowerline St',
        address: '1128 Lowerline St, New Orleans, LA',
        description: 'Student housing property with Planters Bank financing',
        bedrooms: 4,
        bathrooms: 2,
        price: 348984,
        squareFeet: 1600,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2024-10-11'),
        acquisitionPrice: 348984,
        currentValue: 380000,
        occupancyRate: 100,
        monthlyRent: 3200,
        annualExpenses: 12000,
        capRate: 6.5
      }
    }),
    // 7900 Maple St
    prisma.property.create({
      data: {
        propertyId: 10,
        name: '7900 Maple St',
        address: '7900 Maple St, New Orleans, LA',
        description: 'Development property under construction',
        bedrooms: 0,
        bathrooms: 0,
        price: 904918,
        squareFeet: 0,
        propertyType: 'COMMERCIAL',
        acquisitionDate: new Date('2024-01-01'),
        acquisitionPrice: 904918,
        currentValue: 1000000,
        occupancyRate: 0,
        monthlyRent: 0,
        annualExpenses: 50000,
        capRate: 0
      }
    })
  ])

  console.log('✅ Properties created')

  // Create investments - Steven Rovner gets most investments, Sam Torres gets some
  const investments = await Promise.all([
    // 7700 Burthe St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[0].id,
        investmentAmount: 28073,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2023-04-25')
      }
    }),
    // 2422 Joseph St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[1].id,
        investmentAmount: 33123,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2023-04-25')
      }
    }),
    // 7608 Zimple St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[2].id,
        investmentAmount: 11111,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2023-04-25')
      }
    }),
    // 7500 Zimple St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[3].id,
        investmentAmount: 20162,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2023-06-23')
      }
    }),
    // 7506 Zimple St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[4].id,
        investmentAmount: 6159,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2023-12-15')
      }
    }),
    // 1414 Audubon St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[5].id,
        investmentAmount: 162415,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2023-10-30')
      }
    }),
    // 460 NW 20th St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[6].id,
        investmentAmount: 8000,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2024-01-29')
      }
    }),
    // 7313-15 Freret St - Steven Rovner and Sam Torres investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[7].id,
        investmentAmount: 32102,
        ownershipPercentage: 66.37,
        status: 'ACTIVE',
        investmentDate: new Date('2024-09-27')
      }
    }),
    prisma.investment.create({
      data: {
        userId: users[2].id, // Sam Torres
        propertyId: properties[7].id,
        investmentAmount: 16269,
        ownershipPercentage: 33.63,
        status: 'ACTIVE',
        investmentDate: new Date('2024-09-27')
      }
    }),
    // 1128 Lowerline St - Steven Rovner and Sam Torres investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[8].id,
        investmentAmount: 69180,
        ownershipPercentage: 49.87,
        status: 'ACTIVE',
        investmentDate: new Date('2024-10-11')
      }
    }),
    prisma.investment.create({
      data: {
        userId: users[2].id, // Sam Torres
        propertyId: properties[8].id,
        investmentAmount: 69180,
        ownershipPercentage: 49.87,
        status: 'ACTIVE',
        investmentDate: new Date('2024-10-11')
      }
    }),
    // 7900 Maple St - Steven Rovner investment
    prisma.investment.create({
      data: {
        userId: users[1].id, // Steven Rovner
        propertyId: properties[9].id,
        investmentAmount: 904919,
        ownershipPercentage: 100,
        status: 'ACTIVE',
        investmentDate: new Date('2024-01-01')
      }
    })
  ])

  console.log('✅ Investments created')

  // Create distributions for rental income
  const distributions = await Promise.all([
    prisma.distribution.create({
      data: {
        investmentId: investments[0].id,
        userId: users[1].id, // Steven Rovner
        amount: 4500,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 7700 Burthe St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[1].id,
        userId: users[1].id, // Steven Rovner
        amount: 5000,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 2422 Joseph St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[2].id,
        userId: users[1].id, // Steven Rovner
        amount: 3500,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 7608 Zimple St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[3].id,
        userId: users[1].id, // Steven Rovner
        amount: 5500,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 7500 Zimple St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[4].id,
        userId: users[1].id, // Steven Rovner
        amount: 4200,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 7506 Zimple St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[5].id,
        userId: users[1].id, // Steven Rovner
        amount: 5200,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 1414 Audubon St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[6].id,
        userId: users[1].id, // Steven Rovner
        amount: 2800,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 460 NW 20th St'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[7].id,
        userId: users[1].id, // Steven Rovner
        amount: 4800,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 7313-15 Freret St (Steven portion)'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[8].id,
        userId: users[2].id, // Sam Torres
        amount: 2400,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 7313-15 Freret St (Sam portion)'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[9].id,
        userId: users[1].id, // Steven Rovner
        amount: 1600,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 1128 Lowerline St (Steven portion)'
      }
    }),
    prisma.distribution.create({
      data: {
        investmentId: investments[10].id,
        userId: users[2].id, // Sam Torres
        amount: 1600,
        distributionDate: new Date('2024-12-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income - 1128 Lowerline St (Sam portion)'
      }
    })
  ])

  console.log('✅ Distributions created')

  // Create debt documents for each property
  const debtDocuments = await Promise.all([
    prisma.document.create({
      data: {
        title: 'Metairie Bank Loan - 7700 Burthe St',
        description: 'Original loan: $860,000, Current balance: $831,927, Monthly payment: $5,859',
        fileName: 'metairie-bank-7700-burthe.pdf',
        filePath: '/documents/metairie-bank-7700-burthe.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[0].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Metairie Bank Loan 1 - 2422 Joseph St',
        description: 'Original loan: $620,000, Current balance: $588,149, Monthly payment: $4,658',
        fileName: 'metairie-bank-2422-joseph-1.pdf',
        filePath: '/documents/metairie-bank-2422-joseph-1.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[1].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Metairie Bank Loan - 7608 Zimple St',
        description: 'Original loan: $442,500, Current balance: $431,389, Monthly payment: $3,299',
        fileName: 'metairie-bank-7608-zimple.pdf',
        filePath: '/documents/metairie-bank-7608-zimple.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[2].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Metairie Bank Loan - 7500 Zimple St',
        description: 'Original loan: $832,000, Current balance: $811,838, Monthly payment: $6,576',
        fileName: 'metairie-bank-7500-zimple.pdf',
        filePath: '/documents/metairie-bank-7500-zimple.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[3].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Metairie Bank Loan - 7506 Zimple St',
        description: 'Original loan: $577,600, Current balance: $571,441, Monthly payment: $3,730',
        fileName: 'metairie-bank-7506-zimple.pdf',
        filePath: '/documents/metairie-bank-7506-zimple.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[4].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Metairie Bank Loan 1 - 1414 Audubon St',
        description: 'Original loan: $631,875, Current balance: $610,299, Monthly payment: $5,134',
        fileName: 'metairie-bank-1414-audubon-1.pdf',
        filePath: '/documents/metairie-bank-1414-audubon-1.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[5].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'JD Bank Loan - 460 NW 20th St',
        description: 'Original loan: $198,000, Current balance: $190,000, Monthly payment: $1,646',
        fileName: 'jd-bank-460-nw-20th.pdf',
        filePath: '/documents/jd-bank-460-nw-20th.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[6].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Planters Bank Loan - 7313-15 Freret St',
        description: 'Original loan: $847,556, Current balance: $847,556, Monthly payment: $7,327',
        fileName: 'planters-bank-7313-15-freret.pdf',
        filePath: '/documents/planters-bank-7313-15-freret.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[7].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    }),
    prisma.document.create({
      data: {
        title: 'Planters Bank Loan - 1128 Lowerline St',
        description: 'Original loan: $348,984, Current balance: $348,984, Monthly payment: $2,200',
        fileName: 'planters-bank-1128-lowerline.pdf',
        filePath: '/documents/planters-bank-1128-lowerline.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentType: 'OTHER',
        entityType: 'PROPERTY',
        entityId: properties[8].id,
        uploadedBy: users[0].id // Alec Rovner (Admin)
      }
    })
  ])

  console.log('✅ Debt documents created')

  console.log('🎉 User roles fixed and database recreated successfully!')
  console.log(`📊 Created ${users.length} users with correct roles`)
  console.log(`🏠 Created ${properties.length} properties`)
  console.log(`💰 Created ${investments.length} investments`)
  console.log(`💸 Created ${distributions.length} distributions`)
  console.log(`📄 Created ${debtDocuments.length} debt documents`)
  console.log('')
  console.log('🔑 Login Credentials:')
  console.log('👑 Admin: rovnerproperties@gmail.com / Celarev0319942002!')
  console.log('💰 Investor: srovner@dial-law.com / 15Saratoga!')
  console.log('💰 Investor: torres.samd@gmail.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error fixing user roles:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 