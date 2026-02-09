-- Update deal_photos to link to property (idempotent; no-op if already on propertyId only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_photos' AND column_name = 'investmentId') THEN
    ALTER TABLE "deal_photos" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
    UPDATE "deal_photos" dp SET "propertyId" = i."propertyId"
    FROM "investments" i WHERE dp."investmentId" = i.id AND dp."propertyId" IS NULL;
    ALTER TABLE "deal_photos" ALTER COLUMN "propertyId" SET NOT NULL;
    ALTER TABLE "deal_photos" ALTER COLUMN "investmentId" DROP NOT NULL;
    ALTER TABLE "deal_photos" DROP CONSTRAINT IF EXISTS "deal_photos_investmentId_fkey";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "deal_photos_propertyId_idx" ON "deal_photos"("propertyId");
CREATE INDEX IF NOT EXISTS "deal_photos_propertyId_displayOrder_idx" ON "deal_photos"("propertyId", "displayOrder");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_photos_propertyId_fkey') THEN
    ALTER TABLE "deal_photos" ADD CONSTRAINT "deal_photos_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
