import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userPreferences: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return user;
}

export async function createInitialUsers() {
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
    console.log('✅ Admin user created');
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
    console.log('✅ Investor user created');
  }

  // Create a sponsor user for fund management
  const existingSponsor = await prisma.user.findUnique({
    where: { email: 'sponsor@campusrentals.com' },
  });

  if (!existingSponsor) {
    const sponsorPassword = await hashPassword('Sponsor2024!');
    await prisma.user.create({
      data: {
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
    console.log('✅ Sponsor user created');
  }
}

// Enhanced user management functions
export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}) {
  const hashedPassword = await hashPassword(userData.password);
  
  return await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
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
    include: {
      userPreferences: true,
    },
  });
}

export async function updateUser(userId: string, updateData: any) {
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      userPreferences: true,
    },
  });
}

export async function getUserWithPreferences(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPreferences: true,
      investments: {
        include: {
          property: true,
          distributions: true,
        },
      },
      fundInvestments: {
        include: {
          fund: true,
          fundDistributions: true,
        },
      },
    },
  });
} 