-- Add entityInvestmentId column to deal_photos table
ALTER TABLE "deal_photos" 
ADD COLUMN IF NOT EXISTS "entityInvestmentId" TEXT;

-- Make investmentId nullable (since we now support both types)
ALTER TABLE "deal_photos" 
ALTER COLUMN "investmentId" DROP NOT NULL;

-- Create index for entityInvestmentId
CREATE INDEX IF NOT EXISTS "deal_photos_entityInvestmentId_idx" ON "deal_photos"("entityInvestmentId");
CREATE INDEX IF NOT EXISTS "deal_photos_entityInvestmentId_displayOrder_idx" ON "deal_photos"("entityInvestmentId", "displayOrder");

-- Add foreign key constraint for entityInvestmentId
ALTER TABLE "deal_photos" 
ADD CONSTRAINT "deal_photos_entityInvestmentId_fkey" 
FOREIGN KEY ("entityInvestmentId") 
REFERENCES "entity_investments"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: We keep the existing investmentId foreign key constraint
-- The schema allows either investmentId OR entityInvestmentId to be set

