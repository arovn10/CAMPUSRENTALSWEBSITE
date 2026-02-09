-- Pipeline deal files: files attached to CRM pipeline deals (including prospective deals with no property)
CREATE TABLE IF NOT EXISTS "pipeline_deal_files" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_deal_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pipeline_deal_files_dealId_idx" ON "pipeline_deal_files"("dealId");
CREATE INDEX IF NOT EXISTS "pipeline_deal_files_uploadedById_idx" ON "pipeline_deal_files"("uploadedById");

-- Add constraints only if they do not exist (idempotent, preserves data when re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_deal_files_dealId_fkey') THEN
    ALTER TABLE "pipeline_deal_files" ADD CONSTRAINT "pipeline_deal_files_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_deal_files_uploadedById_fkey') THEN
    ALTER TABLE "pipeline_deal_files" ADD CONSTRAINT "pipeline_deal_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
