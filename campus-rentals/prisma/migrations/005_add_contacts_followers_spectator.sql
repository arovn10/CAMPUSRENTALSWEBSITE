-- Add InvestmentType enum
CREATE TYPE "InvestmentType" AS ENUM ('INVESTOR', 'SPECTATOR');

-- Add investmentType column to investments table
ALTER TABLE "investments" ADD COLUMN "investmentType" "InvestmentType" NOT NULL DEFAULT 'INVESTOR';

-- Make investmentAmount and ownershipPercentage nullable for SPECTATOR type
ALTER TABLE "investments" ALTER COLUMN "investmentAmount" DROP NOT NULL;
ALTER TABLE "investments" ALTER COLUMN "ownershipPercentage" DROP NOT NULL;
ALTER TABLE "investments" ALTER COLUMN "investmentDate" DROP NOT NULL;

-- Add new fields to investments table
ALTER TABLE "investments" ADD COLUMN "preferredReturn" DOUBLE PRECISION;
ALTER TABLE "investments" ADD COLUMN "percentOfProceeds" DOUBLE PRECISION;
ALTER TABLE "investments" ADD COLUMN "preferredDistributionMethod" TEXT;
ALTER TABLE "investments" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "investments" ADD COLUMN "externalSystem1" TEXT;
ALTER TABLE "investments" ADD COLUMN "externalId" TEXT;
ALTER TABLE "investments" ADD COLUMN "investmentDescription" TEXT;
ALTER TABLE "investments" ADD COLUMN "receivedDate" TIMESTAMP(3);

-- Create contacts table
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "title" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "notes" TEXT,
    "tags" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- Create deal_followers table
CREATE TABLE "deal_followers" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT,
    "userId" TEXT,
    "accessLevel" TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    "notes" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_followers_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_createdBy_idx" ON "contacts"("createdBy");
CREATE INDEX "deal_followers_propertyId_idx" ON "deal_followers"("propertyId");
CREATE INDEX "deal_followers_contactId_idx" ON "deal_followers"("contactId");
CREATE INDEX "deal_followers_userId_idx" ON "deal_followers"("userId");

-- Create unique constraints
CREATE UNIQUE INDEX "deal_followers_propertyId_contactId_key" ON "deal_followers"("propertyId", "contactId");
CREATE UNIQUE INDEX "deal_followers_propertyId_userId_key" ON "deal_followers"("propertyId", "userId");

-- Add foreign key constraints
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_followers" ADD CONSTRAINT "deal_followers_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_followers" ADD CONSTRAINT "deal_followers_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_followers" ADD CONSTRAINT "deal_followers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_followers" ADD CONSTRAINT "deal_followers_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

