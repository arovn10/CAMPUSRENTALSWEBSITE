-- Update deal_photos to link to property instead of investment
-- First, add propertyId column
ALTER TABLE "deal_photos" 
ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

-- Migrate existing data: get propertyId from investment
UPDATE "deal_photos" dp
SET "propertyId" = i."propertyId"
FROM "investments" i
WHERE dp."investmentId" = i.id
AND dp."propertyId" IS NULL;

-- Make propertyId NOT NULL after migration
ALTER TABLE "deal_photos" 
ALTER COLUMN "propertyId" SET NOT NULL;

-- Make investmentId nullable (we'll keep it for backward compatibility but not use it)
ALTER TABLE "deal_photos" 
ALTER COLUMN "investmentId" DROP NOT NULL;

-- Create indexes for propertyId
CREATE INDEX IF NOT EXISTS "deal_photos_propertyId_idx" ON "deal_photos"("propertyId");
CREATE INDEX IF NOT EXISTS "deal_photos_propertyId_displayOrder_idx" ON "deal_photos"("propertyId", "displayOrder");

-- Add foreign key constraint for propertyId
ALTER TABLE "deal_photos" 
ADD CONSTRAINT "deal_photos_propertyId_fkey" 
FOREIGN KEY ("propertyId") 
REFERENCES "properties"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove old investmentId foreign key constraint (keep the column but remove constraint)
ALTER TABLE "deal_photos" 
DROP CONSTRAINT IF EXISTS "deal_photos_investmentId_fkey";

