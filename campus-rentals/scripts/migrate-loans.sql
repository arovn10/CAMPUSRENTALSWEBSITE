-- Migration script to create property_loans table
-- Run this if Prisma migration doesn't work, or run: npx prisma migrate dev

CREATE TABLE IF NOT EXISTS "property_loans" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "lenderName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "loanDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "monthlyPayment" DOUBLE PRECISION,
    "loanType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_loans_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "property_loans" ADD CONSTRAINT "property_loans_propertyId_fkey" 
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_loans" ADD CONSTRAINT "property_loans_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "property_loans_propertyId_idx" ON "property_loans"("propertyId");
CREATE INDEX IF NOT EXISTS "property_loans_isActive_idx" ON "property_loans"("isActive");
CREATE INDEX IF NOT EXISTS "property_loans_createdBy_idx" ON "property_loans"("createdBy");

