import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'rovnerproperties@gmail.com' },
  });

  if (!existingAdmin) {
    const adminPassword = await hashPassword('Celarev0319942002!');
    await prisma.user.create({
      data: {
        email: 'rovnerproperties@gmail.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created: rovnerproperties@gmail.com');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // Check if investor user already exists
  const existingInvestor = await prisma.user.findUnique({
    where: { email: 'srovner@dial-law.com' },
  });

  if (!existingInvestor) {
    const investorPassword = await hashPassword('15Saratoga!');
    await prisma.user.create({
      data: {
        email: 'srovner@dial-law.com',
        password: investorPassword,
        firstName: 'Investor',
        lastName: 'User',
        role: 'INVESTOR',
      },
    });
    console.log('✅ Investor user created: srovner@dial-law.com');
  } else {
    console.log('ℹ️ Investor user already exists');
  }

  // Create actual properties from the provided data
  const actualProperties = [
    {
      propertyId: 1,
      name: '2422 Joseph St.',
      address: '2422 Joseph St, New Orleans, LA 70118',
      description: 'Beautiful home on Joseph St. only a 10-minute walk to campus! The house is on an extremely well-kempt street and only a few blocks from Starbucks and many other Freret Street shops. This listing is for the lower unit of the house which consists of 4 bedrooms and 2.5 baths. There is a large backyard that is shared with the upper unit and a driveway as well. The unit will be fully furnished.',
      bedrooms: 4,
      bathrooms: 2,
      price: 5000,
      squareFeet: 1400,
      school: 'Tulane University',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg',
      leaseTerms: new Date('2025-06-01T20:01:52.000Z'),
      latitude: 29.9389,
      longitude: -90.1267,
    },
    {
      propertyId: 2,
      name: '2424 Joseph St',
      address: '2424 Joseph St, New Orleans, LA 70115',
      description: 'Beautiful home on Joseph St. only a 10-minute walk to campus! The house is on an extremely well-kempt street and only a few blocks from Starbucks and many other Freret Street shops. This listing is for the upper unit of the house which consists of 3 bedrooms and 2 baths. There is a large backyard that is shared with the lower unit and a driveway as well. The unit comes fully furnished',
      bedrooms: 3,
      bathrooms: 2,
      price: 4050,
      squareFeet: 1200,
      school: 'Tulane University',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/C8D725A7-58EE-4E7A-B73A-2B4D92EA566A.jpg',
      leaseTerms: new Date('2026-06-01T20:03:32.000Z'),
      latitude: 29.9389,
      longitude: -90.1266,
    },
    {
      propertyId: 3,
      name: '7506 Zimple St ',
      address: '7506 Zimple St, New Orleans, LA 70118',
      description: 'Just 3 blocks from Tulane University, this gorgeous 3 bed 2 bath two-story apartment is perfect for your needs. Designed meticulously to host guests with the kitchen, powder room, and storage room all on the first floor. All bedrooms, full bathrooms, and laundry facilities are on the second floor! This unit comes fully furnished with a ring security system and gated parking. The pictures presented are very close renderings as to what the house will look like when completed. This listing is for the rear unit.',
      bedrooms: 3,
      bathrooms: 2,
      price: 3000,
      squareFeet: 1500,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2027-06-01T20:04:02.000Z'),
      latitude: 29.9425,
      longitude: -90.1289,
    },
    {
      propertyId: 4,
      name: '7504 Zimple St ',
      address: '7504 Zimple St, New Orleans, LA 70118',
      description: 'Just 3 blocks from Tulane University, this gorgeous two-story apartment is perfect for your needs. Designed meticulously to host guests with the kitchen, powder room, and storage room all on the first floor. All bedrooms, full bathrooms, and laundry facilities are on the second floor! This unit comes fully furnished with a ring security system and gated parking. The pictures presented are very close renderings as to what the house will look like when completed. This listing is for the rear unit.',
      bedrooms: 3,
      bathrooms: 2,
      price: 7200,
      squareFeet: 1600,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2027-06-01T20:04:19.000Z'),
      latitude: 29.9424,
      longitude: -90.1288,
    },
    {
      propertyId: 5,
      name: '1032 Cherokee St ',
      address: '1032 Cherokee St, New Orleans, LA 70118',
      description: 'Beautifully renovated single-family home right near campus! Find all of your needs met with this fully furnished property just three blocks from the new Tulane Police Headquarters, The Boot, and Tulane itself. Message for more info!',
      bedrooms: 3,
      bathrooms: 2,
      price: 5400,
      squareFeet: 1100,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2026-06-01T20:05:54.000Z'),
      latitude: 29.9378,
      longitude: -90.1234,
    },
    {
      propertyId: 6,
      name: '7315 Freret St ',
      address: '7315 Freret St , New Orleans , LA 70118',
      description: 'Discover the perfect blend of comfort and convenience with this fully furnished unit located at 7313 Freret St. Ideal for Tulane students, this home offers everything you need to excel academically while enjoying the vibrant student life just minutes from campus. Key Features: Prime Tulane Location: Situated on Freret Street, this unit is just a short distance from Tulane University\'s campus, providing easy access to classes, study spots, and campus events. Modern and Spacious: The open-concept living and dining areas offer a perfect environment for both studying and socializing, making it a great choice for students. Fully Furnished: Move-in ready with all essentials, including comfortable beds, desks, sofas, and a living room TV—everything you need to feel at home. Updated Kitchen: Featuring stainless steel appliances, quartz countertops, and ample cabinet space for all your cooking needs. Private Bedrooms: Four well-sized bedrooms with closets, ideal for students needing a quiet retreat for study or rest. Contemporary Bathrooms: Enjoy two full bathrooms with modern fixtures and a clean, sleek design. In-Unit Laundry: Washer and dryer included, offering the ultimate convenience. High-Speed Internet: Stay connected with fast, reliable Wi-Fi, perfect for online classes and streaming. Secure and Safe: The unit offers keyless entry and secure access for peace of mind. Convenient to Tulane Hotspots: Close to all your favorite Tulane hangouts, including the LBC, Reily Recreation Center, and the lively Freret Street corridor with its cafes, shops, and restaurants.',
      bedrooms: 2,
      bathrooms: 2,
      price: 6800,
      squareFeet: 1200,
      school: 'Tulane University',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/FAE13088-D469-4A2D-BE0D-54235CC897A5.jpg',
      leaseTerms: new Date('2026-06-02T01:46:38.000Z'),
      latitude: 29.9444,
      longitude: -90.1277,
    },
    {
      propertyId: 7,
      name: '1414 Audubon St ',
      address: '1414 Audubon St, New Orleans, LA 70118',
      description: 'Just steps from campus, 1414 Audubon Street offers a gorgeous, fully furnished home with high-end finishes and a modern, comfortable design. Enjoy off-street parking, an open-concept living area, stylish furniture throughout, and an in-unit washer and dryer — all in an unbeatable location. With campus only a stone\'s throw away, this home delivers the perfect combination of convenience, style, and comfort. Enjoy off-street parking, spacious bedrooms, in-unit laundry, and an open-concept kitchen and living area perfect for everyday living and hosting friends. With campus only a stone\'s throw away, this location is hard to beat',
      bedrooms: 4,
      bathrooms: 3,
      price: 7200,
      squareFeet: 2000,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2025-06-01T20:08:39.000Z'),
      latitude: 29.9356,
      longitude: -90.1234,
    },
    {
      propertyId: 8,
      name: '7500 Zimple St ',
      address: '7500 Zimple St , New Orleans , LA 70118',
      description: 'Beautifully renovated single-family home right near campus! Find all of your needs met with this fully furnished property just three blocks from the new Tulane Police Headquarters, The Boot, and Tulane itself. Message for more info!',
      bedrooms: 3,
      bathrooms: 2,
      price: 7200,
      squareFeet: 1500,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2026-06-01T20:07:58.000Z'),
      latitude: 29.9423,
      longitude: -90.1287,
    },
    {
      propertyId: 9,
      name: '1416 Audubon St ',
      address: '1416 Audubon St , New Orleans , LA 70118',
      description: 'Located just steps from campus, 1416 Audubon Street offers a brand new, fully furnished 3-bedroom, 2-bath home designed for modern student living. Thoughtfully finished with stylish furniture and high-end touches, this home provides a seamless blend of comfort and convenience.... Enjoy off-street parking, spacious bedrooms, in-unit laundry, and an open-concept kitchen and living area perfect for everyday living and hosting friends. With campus only a stone\'s throw away, this location is hard to beat',
      bedrooms: 3,
      bathrooms: 2,
      price: 5600,
      squareFeet: 1500,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2027-06-01T20:08:18.000Z'),
      latitude: 29.9355,
      longitude: -90.1233,
    },
    {
      propertyId: 10,
      name: '7700 Burthe St ',
      address: '7700 Burthe St , New Orleans , LA 70118',
      description: 'Elevate your student living experience with this fully furnished 4-bedroom, 2.5-bathroom upstairs unit at 7700 Burthe St. Nestled in a quiet and picturesque neighborhood, this unit is perfect for Tulane students looking for a serene yet convenient place to call home.... Key Features: Ideal Tulane Location: Located on Burthe Street, this unit is just a short walk or bike ride away from Tulane University\'s campus, making it easy to attend classes, study at the library, and participate in campus activities. Spacious and Bright: The upstairs unit offers an open-concept living and dining area with plenty of natural light, creating a welcoming space for studying or hanging out with friends. Fully Furnished: Move right in with all essentials provided, including comfortable beds, desks, sofas, and a living room TV, making it perfect for Tulane students. Modern Kitchen: Enjoy cooking in a kitchen equipped with stainless steel appliances, quartz countertops, and ample cabinet space. Private Bedrooms with Walk-In Closets: Four well-sized bedrooms, each featuring a walk-in closet, provide ample storage and a personal retreat for studying and relaxation. Updated Bathrooms: Two full bathrooms with modern fixtures and a clean, sleek design, plus a convenient powder room for guests. Bonus Makeup/Study Room: A dedicated makeup/study room offers extra space for getting ready or focusing on your studies. In-Unit Laundry: Washer and dryer included for your convenience, making laundry day hassle-free. High-Speed Internet: Stay connected with reliable Wi-Fi, essential for online classes and streaming. Secure and Safe: The unit offers keyless entry and secure access, ensuring peace of mind. Charming Neighborhood: Enjoy the peaceful atmosphere of Burthe Street, with easy access to nearby green spaces, Starbucks, and popular Tulane hangouts like The Boot and Maple Street.',
      bedrooms: 4,
      bathrooms: 2,
      price: 7200,
      squareFeet: 1600,
      school: 'Tulane University',
      photo: 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/DFDFAA57-6C09-4631-91EE-6749113B6A67.jpg',
      leaseTerms: new Date('2027-06-01'),
      latitude: 29.9467,
      longitude: -90.1289,
    },
    {
      propertyId: 11,
      name: '7702 Burthe St ',
      address: '7702 Burthe St , New Orleans , LA 70118',
      description: 'Brand new construction on the corner of Burthe and Adams! Each bedroom is approximately 12ftx12ft with walk-in closets. Enjoy an extremely spacious living area, top-of-the-line appliances and finishes, a built-in study area, and modern security amenities. This apartment also has off-street parking and is in a great location. Right next door you have Starbucks, Maple Street Cafe, and many other Tulane favorites! This listing is the downstairs unit.',
      bedrooms: 4,
      bathrooms: 2,
      price: 7200,
      squareFeet: 1600,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2026-06-01'),
      latitude: 29.9466,
      longitude: -90.1288,
    },
    {
      propertyId: 12,
      name: '7608 Zimple St ',
      address: '7608 Zimple St , New Orleans , LA 70118',
      description: 'Beautiful single family home right by campus! Enjoy brand-new stainless steel appliances, top-of-the-line finishes, vaulted ceilings in the main living area, and perfectly fitted furniture. Great location just a few blocks from the boot, the new TUPD headquarters, and the entrance to campus! Please contact for more info.',
      bedrooms: 4,
      bathrooms: 2,
      price: 7200,
      squareFeet: 1400,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2026-06-01'),
      latitude: 29.9422,
      longitude: -90.1286,
    },
    {
      propertyId: 13,
      name: '7313 Freret St. ',
      address: '7313 Freret St , New Orleans , LA 70118',
      description: 'Discover the perfect blend of comfort and convenience with this fully furnished unit located at 7313 Freret St. Ideal for Tulane students, this home offers everything you need to excel academically while enjoying the vibrant student life just minutes from campus. Key Features: Prime Tulane Location: Situated on Freret Street, this unit is just a short distance from Tulane University\'s campus, providing easy access to classes, study spots, and campus events. Modern and Spacious: The open-concept living and dining areas offer a perfect environment for both studying and socializing, making it a great choice for students. Fully Furnished: Move-in ready with all essentials, including comfortable beds, desks, sofas, and a living room TV—everything you need to feel at home. Updated Kitchen: Featuring stainless steel appliances, quartz countertops, and ample cabinet space for all your cooking needs. Private Bedrooms: Four well-sized bedrooms with closets, ideal for students needing a quiet retreat for study or rest. Contemporary Bathrooms: Enjoy two full bathrooms with modern fixtures and a clean, sleek design. In-Unit Laundry: Washer and dryer included, offering the ultimate convenience. High-Speed Internet: Stay connected with fast, reliable Wi-Fi, perfect for online classes and streaming. Secure and Safe: The unit offers keyless entry and secure access for peace of mind. Convenient to Tulane Hotspots: Close to all your favorite Tulane hangouts, including the LBC, Reily Recreation Center, and the lively Freret Street corridor with its cafes, shops, and restaurants.',
      bedrooms: 2,
      bathrooms: 2,
      price: 7200,
      squareFeet: 1400,
      school: 'Tulane University',
      photo: null,
      leaseTerms: new Date('2027-06-01T04:00:00.000Z'),
      latitude: 29.9445,
      longitude: -90.1278,
    },
  ];

  for (const propertyData of actualProperties) {
    const existingProperty = await prisma.property.findUnique({
      where: { propertyId: propertyData.propertyId },
    });

    if (!existingProperty) {
      await prisma.property.create({
        data: propertyData,
      });
      console.log(`✅ Property created: ${propertyData.name} (ID: ${propertyData.propertyId})`);
    } else {
      console.log(`ℹ️ Property already exists: ${propertyData.name} (ID: ${propertyData.propertyId})`);
    }
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 