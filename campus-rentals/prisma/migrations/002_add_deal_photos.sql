-- Create DealPhoto table (linked to property per current schema)
CREATE TABLE IF NOT EXISTS "deal_photos" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "photoUrl" TEXT NOT NULL,
  "s3Key" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isThumbnail" BOOLEAN NOT NULL DEFAULT false,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deal_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deal_photos_propertyId_idx" ON "deal_photos"("propertyId");
CREATE INDEX IF NOT EXISTS "deal_photos_propertyId_displayOrder_idx" ON "deal_photos"("propertyId", "displayOrder");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_photos_propertyId_fkey') THEN
    ALTER TABLE "deal_photos" ADD CONSTRAINT "deal_photos_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_photos_uploadedBy_fkey') THEN
    ALTER TABLE "deal_photos" ADD CONSTRAINT "deal_photos_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
