-- Add investor profile fields for K1s and tax information
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "taxId" TEXT,
ADD COLUMN IF NOT EXISTS "entityName" TEXT,
ADD COLUMN IF NOT EXISTS "mailingAddress" TEXT,
ADD COLUMN IF NOT EXISTS "mailingCity" TEXT,
ADD COLUMN IF NOT EXISTS "mailingState" TEXT,
ADD COLUMN IF NOT EXISTS "mailingZipCode" TEXT,
ADD COLUMN IF NOT EXISTS "mailingCountry" TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS "entityType" TEXT,
ADD COLUMN IF NOT EXISTS "entityTaxId" TEXT;

-- Add comment
COMMENT ON COLUMN "users"."taxId" IS 'Individual Tax ID / SSN (encrypted)';
COMMENT ON COLUMN "users"."entityName" IS 'Entity name if investing through entity';
COMMENT ON COLUMN "users"."entityType" IS 'Type of entity (LLC, S-Corp, Partnership, etc.)';
COMMENT ON COLUMN "users"."entityTaxId" IS 'Entity Tax ID / EIN (encrypted)';

