-- Phase 4: Enhanced Document Management
-- Adds document versioning, automation, and advanced document features

-- ============================================
-- 1. Document Versions Table
-- ============================================

CREATE TABLE IF NOT EXISTS "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL, -- References documents table
    "versionNumber" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "s3Key" TEXT,
    "changeLog" TEXT, -- Description of changes in this version
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_versions_documentId_idx" ON "document_versions"("documentId");
CREATE INDEX IF NOT EXISTS "document_versions_versionNumber_idx" ON "document_versions"("versionNumber");

-- ============================================
-- 2. Document Automation Rules Table
-- ============================================

CREATE TABLE IF NOT EXISTS "document_automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL, -- 'DEAL_STAGE_CHANGE', 'DATE', 'MANUAL', 'TASK_COMPLETED'
    "triggerConfig" JSONB, -- Configuration for the trigger
    "templateId" TEXT, -- References document_templates
    "actionType" TEXT NOT NULL, -- 'GENERATE_DOCUMENT', 'EMAIL_DOCUMENT', 'ARCHIVE_DOCUMENT'
    "actionConfig" JSONB NOT NULL, -- Configuration for the action
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "document_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_automation_rules_triggerType_idx" ON "document_automation_rules"("triggerType");
CREATE INDEX IF NOT EXISTS "document_automation_rules_templateId_idx" ON "document_automation_rules"("templateId");
CREATE INDEX IF NOT EXISTS "document_automation_rules_isActive_idx" ON "document_automation_rules"("isActive");

-- ============================================
-- 3. Document Tags Table (for better organization)
-- ============================================

CREATE TABLE IF NOT EXISTS "document_tags" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL, -- References documents table
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_tags_documentId_idx" ON "document_tags"("documentId");
CREATE INDEX IF NOT EXISTS "document_tags_tag_idx" ON "document_tags"("tag");
CREATE UNIQUE INDEX IF NOT EXISTS "document_tags_documentId_tag_key" ON "document_tags"("documentId", "tag");

-- ============================================
-- 4. Document Approval Workflow Table
-- ============================================

CREATE TABLE IF NOT EXISTS "document_approvals" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL, -- References documents table
    "versionId" TEXT, -- References document_versions
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "document_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_approvals_documentId_idx" ON "document_approvals"("documentId");
CREATE INDEX IF NOT EXISTS "document_approvals_approverId_idx" ON "document_approvals"("approverId");
CREATE INDEX IF NOT EXISTS "document_approvals_status_idx" ON "document_approvals"("status");

-- ============================================
-- 5. Document Access Log Table (track who viewed/downloaded)
-- ============================================

CREATE TABLE IF NOT EXISTS "document_access_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL, -- References documents table
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL, -- 'VIEWED', 'DOWNLOADED', 'SHARED'
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_access_logs_documentId_idx" ON "document_access_logs"("documentId");
CREATE INDEX IF NOT EXISTS "document_access_logs_userId_idx" ON "document_access_logs"("userId");
CREATE INDEX IF NOT EXISTS "document_access_logs_action_idx" ON "document_access_logs"("action");
CREATE INDEX IF NOT EXISTS "document_access_logs_createdAt_idx" ON "document_access_logs"("createdAt");

-- ============================================
-- 6. Add version tracking to documents table if needed
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'currentVersion') THEN
        ALTER TABLE "documents" ADD COLUMN "currentVersion" INTEGER DEFAULT 1;
        COMMENT ON COLUMN "documents"."currentVersion" IS 'Current version number of the document';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'isArchived') THEN
        ALTER TABLE "documents" ADD COLUMN "isArchived" BOOLEAN DEFAULT false;
        COMMENT ON COLUMN "documents"."isArchived" IS 'Whether the document is archived';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'archivedAt') THEN
        ALTER TABLE "documents" ADD COLUMN "archivedAt" TIMESTAMP(3);
        COMMENT ON COLUMN "documents"."archivedAt" IS 'When the document was archived';
    END IF;
END $$;

