const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedData() {
  try {
    console.log('🌱 Seeding database with sample investor portal data...')

    // Create sample users
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@campusrentalsllc.com' },
      update: {},
      create: {
        email: 'admin@campusrentalsllc.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
    })

    const investor1 = await prisma.user.upsert({
      where: { email: 'investor1@example.com' },
      update: {},
      create: {
        email: 'investor1@example.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'INVESTOR',
        isActive: true,
      },
    })

    const investor2 = await prisma.user.upsert({
      where: { email: 'investor2@example.com' },
      update: {},
      create: {
        email: 'investor2@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'INVESTOR',
        isActive: true,
      },
    })

    const manager = await prisma.user.upsert({
      where: { email: 'manager@campusrentalsllc.com' },
      update: {},
      create: {
        email: 'manager@campusrentalsllc.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'MANAGER',
        isActive: true,
      },
    })

    console.log('✅ Users created')

    // Create sample properties
    const property1 = await prisma.property.upsert({
      where: { propertyId: 1 },
      update: {},
      create: {
        propertyId: 1,
        name: '2422 Joseph St.',
        address: '2422 Joseph St, New Orleans, LA 70118',
        description: 'Beautiful 4-bedroom property near Tulane University',
        bedrooms: 4,
        bathrooms: 2,
        price: 500000,
        squareFeet: 1400,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2024-01-15'),
        acquisitionPrice: 450000,
        currentValue: 520000,
        occupancyRate: 95,
        monthlyRent: 3500,
        annualExpenses: 15000,
        capRate: 6.5,
        isActive: true,
      },
    })

    const property2 = await prisma.property.upsert({
      where: { propertyId: 2 },
      update: {},
      create: {
        propertyId: 2,
        name: '2424 Joseph St',
        address: '2424 Joseph St, New Orleans, LA 70115',
        description: '3-bedroom property with great rental potential',
        bedrooms: 3,
        bathrooms: 2,
        price: 450000,
        squareFeet: 1200,
        propertyType: 'SINGLE_FAMILY',
        acquisitionDate: new Date('2024-03-20'),
        acquisitionPrice: 420000,
        currentValue: 470000,
        occupancyRate: 100,
        monthlyRent: 2800,
        annualExpenses: 12000,
        capRate: 6.8,
        isActive: true,
      },
    })

    const property3 = await prisma.property.upsert({
      where: { propertyId: 3 },
      update: {},
      create: {
        propertyId: 3,
        name: '7506 Zimple St',
        address: '7506 Zimple St, New Orleans, LA 70118',
        description: 'Multi-family property with excellent returns',
        bedrooms: 6,
        bathrooms: 4,
        price: 750000,
        squareFeet: 2400,
        propertyType: 'MULTI_FAMILY',
        acquisitionDate: new Date('2024-02-10'),
        acquisitionPrice: 700000,
        currentValue: 780000,
        occupancyRate: 100,
        monthlyRent: 4800,
        annualExpenses: 20000,
        capRate: 7.2,
        isActive: true,
      },
    })

    console.log('✅ Properties created')

    // Create sample funds
    const fund1 = await prisma.fund.upsert({
      where: { id: 'fund-1' },
      update: {},
      create: {
        id: 'fund-1',
        name: 'Campus Rentals Fund I',
        description: 'First fund focused on student housing near universities',
        fundType: 'REAL_ESTATE',
        targetSize: 5000000,
        currentSize: 3200000,
        isActive: true,
      },
    })

    const fund2 = await prisma.fund.upsert({
      where: { id: 'fund-2' },
      update: {},
      create: {
        id: 'fund-2',
        name: 'Student Housing Growth Fund',
        description: 'Growth fund targeting high-demand student housing markets',
        fundType: 'REAL_ESTATE',
        targetSize: 10000000,
        currentSize: 7500000,
        isActive: true,
      },
    })

    console.log('✅ Funds created')

    // Create sample investments
    const investment1 = await prisma.investment.upsert({
      where: { id: 'inv-1' },
      update: {},
      create: {
        id: 'inv-1',
        userId: investor1.id,
        propertyId: property1.id,
        investmentAmount: 100000,
        ownershipPercentage: 20,
        status: 'ACTIVE',
        investmentDate: new Date('2024-01-20'),
      },
    })

    const investment2 = await prisma.investment.upsert({
      where: { id: 'inv-2' },
      update: {},
      create: {
        id: 'inv-2',
        userId: investor1.id,
        propertyId: property2.id,
        investmentAmount: 75000,
        ownershipPercentage: 16.67,
        status: 'ACTIVE',
        investmentDate: new Date('2024-03-25'),
      },
    })

    const investment3 = await prisma.investment.upsert({
      where: { id: 'inv-3' },
      update: {},
      create: {
        id: 'inv-3',
        userId: investor2.id,
        propertyId: property3.id,
        investmentAmount: 150000,
        ownershipPercentage: 20,
        status: 'ACTIVE',
        investmentDate: new Date('2024-02-15'),
      },
    })

    console.log('✅ Property investments created')

    // Create sample fund investments
    const fundInvestment1 = await prisma.fundInvestment.upsert({
      where: { id: 'fi-1' },
      update: {},
      create: {
        id: 'fi-1',
        userId: investor1.id,
        fundId: fund1.id,
        investmentAmount: 250000,
        ownershipPercentage: 7.81,
        status: 'ACTIVE',
        investmentDate: new Date('2024-01-10'),
      },
    })

    const fundInvestment2 = await prisma.fundInvestment.upsert({
      where: { id: 'fi-2' },
      update: {},
      create: {
        id: 'fi-2',
        userId: investor2.id,
        fundId: fund2.id,
        investmentAmount: 500000,
        ownershipPercentage: 6.67,
        status: 'ACTIVE',
        investmentDate: new Date('2024-02-01'),
      },
    })

    console.log('✅ Fund investments created')

    // Create sample distributions
    const distribution1 = await prisma.distribution.create({
      data: {
        investmentId: investment1.id,
        userId: investor1.id,
        amount: 2500,
        distributionDate: new Date('2024-06-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income distribution',
      },
    })

    const distribution2 = await prisma.distribution.create({
      data: {
        investmentId: investment1.id,
        userId: investor1.id,
        amount: 2500,
        distributionDate: new Date('2024-07-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income distribution',
      },
    })

    const distribution3 = await prisma.distribution.create({
      data: {
        investmentId: investment2.id,
        userId: investor1.id,
        amount: 1800,
        distributionDate: new Date('2024-06-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income distribution',
      },
    })

    const distribution4 = await prisma.distribution.create({
      data: {
        investmentId: investment3.id,
        userId: investor2.id,
        amount: 3200,
        distributionDate: new Date('2024-06-01'),
        distributionType: 'RENTAL_INCOME',
        description: 'Monthly rental income distribution',
      },
    })

    console.log('✅ Distributions created')

    // Create sample fund contributions
    const contribution1 = await prisma.fundContribution.create({
      data: {
        fundId: fund1.id,
        userId: investor1.id,
        amount: 250000,
        contributionDate: new Date('2024-01-10'),
        contributionType: 'CAPITAL_CALL',
        description: 'Initial capital contribution',
      },
    })

    const contribution2 = await prisma.fundContribution.create({
      data: {
        fundId: fund2.id,
        userId: investor2.id,
        amount: 500000,
        contributionDate: new Date('2024-02-01'),
        contributionType: 'CAPITAL_CALL',
        description: 'Initial capital contribution',
      },
    })

    console.log('✅ Fund contributions created')

    // Create sample fund distributions
    const fundDistribution1 = await prisma.fundDistribution.create({
      data: {
        fundId: fund1.id,
        userId: investor1.id,
        amount: 5000,
        distributionDate: new Date('2024-06-15'),
        distributionType: 'PROFIT_DISTRIBUTION',
        description: 'Quarterly profit distribution',
      },
    })

    const fundDistribution2 = await prisma.fundDistribution.create({
      data: {
        fundId: fund2.id,
        userId: investor2.id,
        amount: 12000,
        distributionDate: new Date('2024-06-15'),
        distributionType: 'PROFIT_DISTRIBUTION',
        description: 'Quarterly profit distribution',
      },
    })

    console.log('✅ Fund distributions created')

    // Create sample documents
    const document1 = await prisma.document.create({
      data: {
        title: 'Property Purchase Agreement - 2422 Joseph St',
        description: 'Legal agreement for the purchase of 2422 Joseph St property',
        fileName: 'purchase_agreement_2422_joseph.pdf',
        filePath: '/documents/purchase_agreement_2422_joseph.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        documentType: 'OPERATING_AGREEMENT',
        entityType: 'PROPERTY',
        entityId: property1.id,
        isPublic: false,
        uploadedBy: adminUser.id,
      },
    })

    const document2 = await prisma.document.create({
      data: {
        title: 'Fund I Offering Memorandum',
        description: 'Comprehensive offering memorandum for Campus Rentals Fund I',
        fileName: 'fund_i_offering_memo.pdf',
        filePath: '/documents/fund_i_offering_memo.pdf',
        fileSize: 5120000,
        mimeType: 'application/pdf',
        documentType: 'OFFERING_MEMORANDUM',
        entityType: 'FUND',
        entityId: fund1.id,
        isPublic: true,
        uploadedBy: adminUser.id,
      },
    })

    const document3 = await prisma.document.create({
      data: {
        title: 'Q2 2024 Financial Report',
        description: 'Quarterly financial report for Q2 2024',
        fileName: 'q2_2024_financial_report.pdf',
        filePath: '/documents/q2_2024_financial_report.pdf',
        fileSize: 1536000,
        mimeType: 'application/pdf',
        documentType: 'FINANCIAL_STATEMENT',
        entityType: 'USER',
        entityId: investor1.id,
        isPublic: false,
        uploadedBy: manager.id,
      },
    })

    console.log('✅ Documents created')

    // Create sample notifications
    const notification1 = await prisma.notification.create({
      data: {
        userId: investor1.id,
        title: 'New Distribution Available',
        message: 'A new distribution of $2,500 has been processed for your investment in 2422 Joseph St.',
        type: 'DISTRIBUTION',
        isRead: false,
      },
    })

    const notification2 = await prisma.notification.create({
      data: {
        userId: investor1.id,
        title: 'Document Uploaded',
        message: 'A new document "Q2 2024 Financial Report" has been uploaded to your portal.',
        type: 'DOCUMENT_UPLOAD',
        isRead: false,
      },
    })

    const notification3 = await prisma.notification.create({
      data: {
        userId: investor2.id,
        title: 'Fund Distribution',
        message: 'A fund distribution of $12,000 has been processed for your investment in Student Housing Growth Fund.',
        type: 'DISTRIBUTION',
        isRead: true,
      },
    })

    console.log('✅ Notifications created')

    console.log('🎉 Database seeding completed successfully!')
    console.log('\n📊 Sample Data Summary:')
    console.log(`- Users: 4 (1 Admin, 1 Manager, 2 Investors)`)
    console.log(`- Properties: 3`)
    console.log(`- Funds: 2`)
    console.log(`- Property Investments: 3`)
    console.log(`- Fund Investments: 2`)
    console.log(`- Distributions: 4`)
    console.log(`- Fund Contributions: 2`)
    console.log(`- Fund Distributions: 2`)
    console.log(`- Documents: 3`)
    console.log(`- Notifications: 3`)
    console.log('\n🔑 Test Credentials:')
    console.log('Admin: admin@campusrentalsllc.com')
    console.log('Manager: manager@campusrentalsllc.com')
    console.log('Investor 1: investor1@example.com')
    console.log('Investor 2: investor2@example.com')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedData() 