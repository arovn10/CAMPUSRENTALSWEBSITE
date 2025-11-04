-- Create DealPhoto table for managing photos per investment/deal
CREATE TABLE IF NOT EXISTS "deal_photos" (
  "id" TEXT NOT NULL,
  "investmentId" TEXT NOT NULL,
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
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "deal_photos_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "deal_photos_investmentId_idx" ON "deal_photos"("investmentId");
CREATE INDEX IF NOT EXISTS "deal_photos_investmentId_displayOrder_idx" ON "deal_photos"("investmentId", "displayOrder");

-- Add foreign key constraints
ALTER TABLE "deal_photos" ADD CONSTRAINT "deal_photos_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_photos" ADD CONSTRAINT "deal_photos_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

