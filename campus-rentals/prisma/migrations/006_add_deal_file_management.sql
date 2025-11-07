-- Create deal_folders table
CREATE TABLE "deal_folders" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_folders_pkey" PRIMARY KEY ("id")
);

-- Create deal_files table
CREATE TABLE "deal_files" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "folderId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_files_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "deal_folders_propertyId_idx" ON "deal_folders"("propertyId");
CREATE INDEX "deal_folders_parentFolderId_idx" ON "deal_folders"("parentFolderId");
CREATE INDEX "deal_files_propertyId_idx" ON "deal_files"("propertyId");
CREATE INDEX "deal_files_folderId_idx" ON "deal_files"("folderId");

-- Add foreign key constraints
ALTER TABLE "deal_folders" ADD CONSTRAINT "deal_folders_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_folders" ADD CONSTRAINT "deal_folders_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "deal_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_folders" ADD CONSTRAINT "deal_folders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_files" ADD CONSTRAINT "deal_files_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_files" ADD CONSTRAINT "deal_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "deal_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deal_files" ADD CONSTRAINT "deal_files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

