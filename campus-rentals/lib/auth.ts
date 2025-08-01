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
      },
    });
    console.log('✅ Investor user created');
  }
} 