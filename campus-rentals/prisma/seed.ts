import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users
  const adminPassword = await hashPassword('Celarev0319942002!');
  const investorPassword = await hashPassword('15Saratoga!');
  const sponsorPassword = await hashPassword('Sponsor2024!');

  const admin = await prisma.user.upsert({
    where: { email: 'rovnerproperties@gmail.com' },
    update: {},
    create: {
      email: 'rovnerproperties@gmail.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      kycStatus: 'APPROVED',
      userPreferences: {
        create: {
          emailNotifications: true,
          smsNotifications: false,
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
        },
      },
    },
  });

  const investor = await prisma.user.upsert({
    where: { email: 'srovner@dial-law.com' },
    update: {},
    create: {
      email: 'srovner@dial-law.com',
      password: investorPassword,
      firstName: 'Investor',
      lastName: 'User',
      role: 'INVESTOR',
      kycStatus: 'APPROVED',
      phone: '+1-555-0123',
      address: '123 Main St',
      city: 'Albany',
      state: 'NY',
      zipCode: '12207',
      userPreferences: {
        create: {
          emailNotifications: true,
          smsNotifications: false,
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
        },
      },
    },
  });

  const sponsor = await prisma.user.upsert({
    where: { email: 'sponsor@campusrentals.com' },
    update: {},
    create: {
      email: 'sponsor@campusrentals.com',
      password: sponsorPassword,
      firstName: 'Fund',
      lastName: 'Sponsor',
      role: 'SPONSOR',
      kycStatus: 'APPROVED',
      userPreferences: {
        create: {
          emailNotifications: true,
          smsNotifications: false,
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
        },
      },
    },
  });

  // Create additional investors
  const investor2 = await prisma.user.upsert({
    where: { email: 'investor2@example.com' },
    update: {},
    create: {
      email: 'investor2@example.com',
      password: await hashPassword('password123'),
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'INVESTOR',
      kycStatus: 'APPROVED',
      phone: '+1-555-0124',
      address: '456 Oak Ave',
      city: 'Schenectady',
      state: 'NY',
      zipCode: '12305',
      userPreferences: {
        create: {
          emailNotifications: true,
          smsNotifications: true,
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
        },
      },
    },
  });

  const investor3 = await prisma.user.upsert({
    where: { email: 'investor3@example.com' },
    update: {},
    create: {
      email: 'investor3@example.com',
      password: await hashPassword('password123'),
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'INVESTOR',
      kycStatus: 'APPROVED',
      phone: '+1-555-0125',
      address: '789 Pine St',
      city: 'Troy',
      state: 'NY',
      zipCode: '12180',
      userPreferences: {
        create: {
          emailNotifications: true,
          smsNotifications: false,
          currency: 'USD',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
        },
      },
    },
  });

  // Create funds
  const fund1 = await prisma.fund.create({
    data: {
      name: 'Campus Rentals Fund I',
      description: 'First fund focused on student housing properties near universities',
      fundType: 'REAL_ESTATE',
      targetSize: 5000000,
      minimumInvestment: 50000,
      maximumInvestment: 500000,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      sponsorId: sponsor.id,
      waterfallConfigs: {
        create: {
          preferredReturn: 8.0,
          promoteThreshold: 80.0,
          promotePercentage: 20.0,
          catchUpPercentage: 100.0,
        },
      },
    },
  });

  const fund2 = await prisma.fund.create({
    data: {
      name: 'Campus Rentals Opportunity Zone Fund',
      description: 'Opportunity zone fund for qualified campus area developments',
      fundType: 'OPPORTUNITY_ZONE',
      targetSize: 10000000,
      minimumInvestment: 100000,
      maximumInvestment: 1000000,
      startDate: new Date('2023-06-01'),
      status: 'ACTIVE',
      sponsorId: sponsor.id,
      waterfallConfigs: {
        create: {
          preferredReturn: 7.0,
          promoteThreshold: 85.0,
          promotePercentage: 15.0,
          catchUpPercentage: 100.0,
        },
      },
    },
  });

  // Create properties that match the external API structure
  // These property IDs should match the ones from the external API
  const properties = [
    {
      propertyId: 1, // This should match the external API property_id
      name: '350A University Ave',
      address: '350A University Ave, Albany, NY 12203',
      description: 'Modern 3-bedroom apartment near UAlbany campus',
      bedrooms: 3,
      bathrooms: 2,
      price: 450000,
      squareFeet: 1200,
      school: 'University at Albany',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
      leaseTerms: new Date('2024-08-01'),
      latitude: 42.6862,
      longitude: -73.8233,
      propertyType: 'SINGLE_FAMILY',
      acquisitionDate: new Date('2023-03-15'),
      acquisitionPrice: 420000,
      currentValue: 450000,
      occupancyRate: 100,
      monthlyRent: 2800,
      annualExpenses: 18000,
      capRate: 6.2,
    },
    {
      propertyId: 2, // This should match the external API property_id
      name: 'C8D725 Pine Hills',
      address: 'C8D725 Pine Hills, Albany, NY 12208',
      description: 'Spacious 4-bedroom townhouse in Pine Hills',
      bedrooms: 4,
      bathrooms: 3,
      price: 520000,
      squareFeet: 1800,
      school: 'University at Albany',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
      leaseTerms: new Date('2024-08-01'),
      latitude: 42.6526,
      longitude: -73.7562,
      propertyType: 'TOWNHOUSE',
      acquisitionDate: new Date('2023-05-20'),
      acquisitionPrice: 490000,
      currentValue: 520000,
      occupancyRate: 100,
      monthlyRent: 3200,
      annualExpenses: 22000,
      capRate: 5.8,
    },
    {
      propertyId: 6, // This should match the external API property_id
      name: 'FAE130 Campus View',
      address: 'FAE130 Campus View, Albany, NY 12203',
      description: 'Luxury 2-bedroom apartment with campus views',
      bedrooms: 2,
      bathrooms: 2,
      price: 380000,
      squareFeet: 1000,
      school: 'University at Albany',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
      leaseTerms: new Date('2024-08-01'),
      latitude: 42.6891,
      longitude: -73.8199,
      propertyType: 'CONDO',
      acquisitionDate: new Date('2023-07-10'),
      acquisitionPrice: 360000,
      currentValue: 380000,
      occupancyRate: 100,
      monthlyRent: 2400,
      annualExpenses: 15000,
      capRate: 6.3,
    },
    {
      propertyId: 10, // This should match the external API property_id
      name: 'DFDFAA College Heights',
      address: 'DFDFAA College Heights, Albany, NY 12208',
      description: 'Family-friendly 3-bedroom home near campus',
      bedrooms: 3,
      bathrooms: 2,
      price: 410000,
      squareFeet: 1400,
      school: 'University at Albany',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
      leaseTerms: new Date('2024-08-01'),
      latitude: 42.6543,
      longitude: -73.7589,
      propertyType: 'SINGLE_FAMILY',
      acquisitionDate: new Date('2023-09-05'),
      acquisitionPrice: 390000,
      currentValue: 410000,
      occupancyRate: 100,
      monthlyRent: 2600,
      annualExpenses: 17000,
      capRate: 6.1,
    },
  ];

  const createdProperties = [];
  for (const propertyData of properties) {
    const property = await prisma.property.upsert({
      where: { propertyId: propertyData.propertyId },
      update: propertyData,
      create: propertyData,
    });
    createdProperties.push(property);
  }

  // Associate properties with funds
  for (const property of createdProperties) {
    await prisma.fundProperty.create({
      data: {
        fundId: fund1.id,
        propertyId: property.id,
        ownershipPercentage: 100,
        acquisitionDate: property.acquisitionDate || new Date(),
        acquisitionPrice: property.acquisitionPrice || property.price,
      },
    });
  }

  // Create investments using the property IDs that match the external API
  const investments = [
    {
      propertyId: '1', // String ID that matches the external API property_id
      userId: investor.id,
      investmentAmount: 150000,
      preferredReturn: 8.0,
      startDate: new Date('2023-04-01'),
      investmentType: 'EQUITY',
      notes: 'Initial investment in University Ave property',
    },
    {
      propertyId: '2', // String ID that matches the external API property_id
      userId: investor.id,
      investmentAmount: 200000,
      preferredReturn: 8.0,
      startDate: new Date('2023-06-01'),
      investmentType: 'EQUITY',
      notes: 'Investment in Pine Hills townhouse',
    },
    {
      propertyId: '1', // String ID that matches the external API property_id
      userId: investor2.id,
      investmentAmount: 100000,
      preferredReturn: 8.0,
      startDate: new Date('2023-04-15'),
      investmentType: 'EQUITY',
      notes: 'Co-investment in University Ave property',
    },
    {
      propertyId: '6', // String ID that matches the external API property_id
      userId: investor3.id,
      investmentAmount: 120000,
      preferredReturn: 8.0,
      startDate: new Date('2023-08-01'),
      investmentType: 'EQUITY',
      notes: 'Investment in Campus View apartment',
    },
  ];

  for (const investmentData of investments) {
    await prisma.investment.create({
      data: investmentData,
    });
  }

  // Create fund investments
  const fundInvestments = [
    {
      fundId: fund1.id,
      userId: investor.id,
      investmentAmount: 300000,
      investmentDate: new Date('2023-02-01'),
      preferredReturn: 8.0,
      notes: 'Initial fund investment',
    },
    {
      fundId: fund1.id,
      userId: investor2.id,
      investmentAmount: 200000,
      investmentDate: new Date('2023-02-15'),
      preferredReturn: 8.0,
      notes: 'Fund investment',
    },
    {
      fundId: fund2.id,
      userId: investor3.id,
      investmentAmount: 150000,
      investmentDate: new Date('2023-07-01'),
      preferredReturn: 7.0,
      notes: 'Opportunity zone fund investment',
    },
  ];

  for (const fundInvestmentData of fundInvestments) {
    await prisma.fundInvestment.create({
      data: fundInvestmentData,
    });
  }

  // Create distributions
  const distributions = [
    {
      propertyId: '1', // String ID that matches the external API property_id
      userId: investor.id,
      investmentId: (await prisma.investment.findFirst({
        where: { propertyId: '1', userId: investor.id },
      }))!.id,
      amount: 12000,
      type: 'PREFERRED_RETURN',
      distributionDate: new Date('2023-12-31'),
      description: 'Annual preferred return distribution',
      taxYear: 2023,
    },
    {
      propertyId: '2', // String ID that matches the external API property_id
      userId: investor.id,
      investmentId: (await prisma.investment.findFirst({
        where: { propertyId: '2', userId: investor.id },
      }))!.id,
      amount: 16000,
      type: 'PREFERRED_RETURN',
      distributionDate: new Date('2023-12-31'),
      description: 'Annual preferred return distribution',
      taxYear: 2023,
    },
    {
      propertyId: '1', // String ID that matches the external API property_id
      userId: investor2.id,
      investmentId: (await prisma.investment.findFirst({
        where: { propertyId: '1', userId: investor2.id },
      }))!.id,
      amount: 8000,
      type: 'PREFERRED_RETURN',
      distributionDate: new Date('2023-12-31'),
      description: 'Annual preferred return distribution',
      taxYear: 2023,
    },
  ];

  for (const distributionData of distributions) {
    await prisma.distribution.create({
      data: distributionData,
    });
  }

  // Create fund distributions
  const fundDistributions = [
    {
      fundId: fund1.id,
      userId: investor.id,
      fundInvestmentId: (await prisma.fundInvestment.findFirst({
        where: { fundId: fund1.id, userId: investor.id },
      }))!.id,
      amount: 24000,
      type: 'PREFERRED_RETURN',
      distributionDate: new Date('2023-12-31'),
      description: 'Annual fund preferred return distribution',
    },
    {
      fundId: fund1.id,
      userId: investor2.id,
      fundInvestmentId: (await prisma.fundInvestment.findFirst({
        where: { fundId: fund1.id, userId: investor2.id },
      }))!.id,
      amount: 16000,
      type: 'PREFERRED_RETURN',
      distributionDate: new Date('2023-12-31'),
      description: 'Annual fund preferred return distribution',
    },
  ];

  for (const fundDistributionData of fundDistributions) {
    await prisma.fundDistribution.create({
      data: fundDistributionData,
    });
  }

  // Create property income and expenses
  for (const property of createdProperties) {
    // Income
    await prisma.propertyIncome.createMany({
      data: [
        {
          propertyId: property.id,
          type: 'RENT',
          amount: property.monthlyRent || 2500,
          date: new Date('2024-01-01'),
          description: 'Monthly rent payment',
        },
        {
          propertyId: property.id,
          type: 'RENT',
          amount: property.monthlyRent || 2500,
          date: new Date('2024-02-01'),
          description: 'Monthly rent payment',
        },
      ],
    });

    // Expenses
    await prisma.propertyExpense.createMany({
      data: [
        {
          propertyId: property.id,
          type: 'MORTGAGE',
          amount: (property.monthlyRent || 2500) * 0.6,
          date: new Date('2024-01-01'),
          description: 'Monthly mortgage payment',
          vendor: 'Bank of America',
        },
        {
          propertyId: property.id,
          type: 'PROPERTY_TAX',
          amount: (property.annualExpenses || 18000) * 0.3,
          date: new Date('2024-01-15'),
          description: 'Property tax payment',
          vendor: 'Albany County',
        },
        {
          propertyId: property.id,
          type: 'INSURANCE',
          amount: (property.annualExpenses || 18000) * 0.1,
          date: new Date('2024-01-01'),
          description: 'Property insurance',
          vendor: 'State Farm',
        },
      ],
    });
  }

  // Create documents
  const documents = [
    {
      title: 'Operating Agreement - Fund I',
      description: 'Fund operating agreement and terms',
      fileName: 'operating_agreement_fund1.pdf',
      filePath: '/documents/fund1/operating_agreement.pdf',
      fileSize: 2048576,
      mimeType: 'application/pdf',
      documentType: 'OPERATING_AGREEMENT',
      entityType: 'FUND',
      entityId: fund1.id,
      uploadedBy: sponsor.id,
      isPublic: false,
    },
    {
      title: 'PPM - Fund I',
      description: 'Private Placement Memorandum',
      fileName: 'ppm_fund1.pdf',
      filePath: '/documents/fund1/ppm.pdf',
      fileSize: 3145728,
      mimeType: 'application/pdf',
      documentType: 'PPM',
      entityType: 'FUND',
      entityId: fund1.id,
      uploadedBy: sponsor.id,
      isPublic: false,
    },
    {
      title: 'Financial Statement Q4 2023',
      description: 'Quarterly financial statement',
      fileName: 'financial_statement_q4_2023.pdf',
      filePath: '/documents/financials/q4_2023.pdf',
      fileSize: 1048576,
      mimeType: 'application/pdf',
      documentType: 'FINANCIAL_STATEMENT',
      entityType: 'PROPERTY',
      entityId: createdProperties[0].id,
      uploadedBy: admin.id,
      isPublic: true,
    },
  ];

  for (const documentData of documents) {
    await prisma.document.create({
      data: documentData,
    });
  }

  // Create notifications
  const notifications = [
    {
      userId: investor.id,
      title: 'Distribution Received',
      message: 'You have received a distribution of $12,000 from 350A University Ave',
      type: 'DISTRIBUTION',
      entityType: 'PROPERTY',
      entityId: createdProperties[0].id,
    },
    {
      userId: investor.id,
      title: 'New Document Available',
      message: 'Q4 2023 Financial Statement is now available',
      type: 'DOCUMENT_UPLOAD',
      entityType: 'PROPERTY',
      entityId: createdProperties[0].id,
    },
    {
      userId: investor2.id,
      title: 'Distribution Received',
      message: 'You have received a distribution of $8,000 from 350A University Ave',
      type: 'DISTRIBUTION',
      entityType: 'PROPERTY',
      entityId: createdProperties[0].id,
    },
  ];

  for (const notificationData of notifications) {
    await prisma.notification.create({
      data: notificationData,
    });
  }

  // Create financial calculations cache
  for (const property of createdProperties) {
    await prisma.financialCalculation.create({
      data: {
        propertyId: property.id,
        calculationType: 'IRR',
        calculationDate: new Date(),
        data: {
          irr: 12.5,
          totalReturn: 45000,
          cashOnCash: 8.2,
          equityMultiple: 1.15,
        },
      },
    });

    await prisma.financialCalculation.create({
      data: {
        propertyId: property.id,
        calculationType: 'CASH_ON_CASH',
        calculationDate: new Date(),
        data: {
          annualIncome: property.monthlyRent ? property.monthlyRent * 12 : 30000,
          annualExpenses: property.annualExpenses || 18000,
          netOperatingIncome: (property.monthlyRent ? property.monthlyRent * 12 : 30000) - (property.annualExpenses || 18000),
          cashOnCashReturn: 8.2,
        },
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${properties.length} properties`);
  console.log(`Created ${investments.length} investments`);
  console.log(`Created ${fundInvestments.length} fund investments`);
  console.log(`Created ${distributions.length} distributions`);
  console.log(`Created ${fundDistributions.length} fund distributions`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 