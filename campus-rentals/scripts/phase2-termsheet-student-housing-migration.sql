-- Phase 2: TermSheet Student Housing Migration
-- Run this directly on the AWS Lightsail database
-- This migration adds student housing specific fields and TermSheet core tables

-- ============================================
-- 1. Add Student Housing Fields to Deals Table
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'totalBeds') THEN
        ALTER TABLE "deals" ADD COLUMN "totalBeds" INTEGER;
        COMMENT ON COLUMN "deals"."totalBeds" IS 'Total number of beds in student housing property';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'totalUnits') THEN
        ALTER TABLE "deals" ADD COLUMN "totalUnits" INTEGER;
        COMMENT ON COLUMN "deals"."totalUnits" IS 'Total number of units in property';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'distanceToCampus') THEN
        ALTER TABLE "deals" ADD COLUMN "distanceToCampus" DOUBLE PRECISION;
        COMMENT ON COLUMN "deals"."distanceToCampus" IS 'Distance to campus in miles';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'walkabilityScore') THEN
        ALTER TABLE "deals" ADD COLUMN "walkabilityScore" INTEGER;
        COMMENT ON COLUMN "deals"."walkabilityScore" IS 'Walkability score (0-100)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'averageRentPerBed') THEN
        ALTER TABLE "deals" ADD COLUMN "averageRentPerBed" DOUBLE PRECISION;
        COMMENT ON COLUMN "deals"."averageRentPerBed" IS 'Average monthly rent per bed';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'universityId') THEN
        ALTER TABLE "deals" ADD COLUMN "universityId" TEXT;
        COMMENT ON COLUMN "deals"."universityId" IS 'Reference to university (Tulane, FAU, etc.)';
    END IF;
END $$;

-- ============================================
-- 2. Create University Table
-- ============================================

CREATE TABLE IF NOT EXISTS "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT, -- e.g., "FAU", "Tulane"
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "enrollment" INTEGER,
    "website" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "universities_name_idx" ON "universities"("name");
CREATE INDEX IF NOT EXISTS "universities_shortName_idx" ON "universities"("shortName");
CREATE INDEX IF NOT EXISTS "universities_city_state_idx" ON "universities"("city", "state");

-- Add foreign key for universityId in deals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deals_universityId_fkey'
    ) THEN
        ALTER TABLE "deals" 
        ADD CONSTRAINT "deals_universityId_fkey" 
        FOREIGN KEY ("universityId") 
        REFERENCES "universities"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "deals_universityId_idx" ON "deals"("universityId");

-- ============================================
-- 3. Create Document Template Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL, -- 'LOI', 'TEAR_SHEET', 'INVESTMENT_MEMO', 'DUE_DILIGENCE', 'PURCHASE_AGREEMENT', 'INVESTOR_UPDATE', 'OTHER'
    "templateType" TEXT NOT NULL, -- 'WORD', 'EXCEL', 'PDF', 'HTML'
    "filePath" TEXT, -- S3 path or local path to template file
    "s3Key" TEXT, -- S3 object key
    "fieldMappings" JSONB, -- Map deal fields to template placeholders
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_templates_category_idx" ON "document_templates"("category");
CREATE INDEX IF NOT EXISTS "document_templates_createdBy_idx" ON "document_templates"("createdBy");

-- Document Generation History
CREATE TABLE IF NOT EXISTS "document_generations" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dealId" TEXT,
    "propertyId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL, -- S3 URL or local path
    "s3Key" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT DEFAULT 'PENDING', -- 'PENDING', 'GENERATING', 'COMPLETED', 'FAILED'
    "errorMessage" TEXT,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "document_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_generations_templateId_idx" ON "document_generations"("templateId");
CREATE INDEX IF NOT EXISTS "document_generations_dealId_idx" ON "document_generations"("dealId");
CREATE INDEX IF NOT EXISTS "document_generations_propertyId_idx" ON "document_generations"("propertyId");
CREATE INDEX IF NOT EXISTS "document_generations_status_idx" ON "document_generations"("status");

-- ============================================
-- 4. Create Excel Integration Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "excel_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL, -- Path to Excel file
    "s3Key" TEXT, -- S3 object key if stored in S3
    "worksheetName" TEXT, -- Specific worksheet to sync
    "isActive" BOOLEAN DEFAULT true,
    "syncEnabled" BOOLEAN DEFAULT false,
    "syncFrequency" TEXT, -- 'MANUAL', 'HOURLY', 'DAILY', 'WEEKLY'
    "lastSyncAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "excel_models_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "excel_models_createdBy_idx" ON "excel_models"("createdBy");
CREATE INDEX IF NOT EXISTS "excel_models_syncEnabled_idx" ON "excel_models"("syncEnabled");

-- Excel Field Mappings
CREATE TABLE IF NOT EXISTS "excel_field_mappings" (
    "id" TEXT NOT NULL,
    "excelModelId" TEXT NOT NULL,
    "excelColumn" TEXT NOT NULL, -- Excel column name or address (e.g., "A1", "Purchase Price")
    "dealField" TEXT NOT NULL, -- Deal field name (e.g., "estimatedValue", "budgetedCost")
    "dataType" TEXT, -- 'NUMBER', 'TEXT', 'DATE', 'BOOLEAN'
    "isRequired" BOOLEAN DEFAULT false,
    "defaultValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "excel_field_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "excel_field_mappings_excelModelId_fkey" FOREIGN KEY ("excelModelId") REFERENCES "excel_models"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "excel_field_mappings_excelModelId_idx" ON "excel_field_mappings"("excelModelId");

-- Excel Sync History
CREATE TABLE IF NOT EXISTS "excel_syncs" (
    "id" TEXT NOT NULL,
    "excelModelId" TEXT NOT NULL,
    "dealId" TEXT,
    "status" TEXT DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    "recordsProcessed" INTEGER DEFAULT 0,
    "recordsUpdated" INTEGER DEFAULT 0,
    "recordsCreated" INTEGER DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    
    CONSTRAINT "excel_syncs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "excel_syncs_excelModelId_fkey" FOREIGN KEY ("excelModelId") REFERENCES "excel_models"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "excel_syncs_excelModelId_idx" ON "excel_syncs"("excelModelId");
CREATE INDEX IF NOT EXISTS "excel_syncs_dealId_idx" ON "excel_syncs"("dealId");
CREATE INDEX IF NOT EXISTS "excel_syncs_status_idx" ON "excel_syncs"("status");
CREATE INDEX IF NOT EXISTS "excel_syncs_startedAt_idx" ON "excel_syncs"("startedAt");

-- ============================================
-- 5. Create Deal Custom Fields Table
-- ============================================

CREATE TABLE IF NOT EXISTS "deal_custom_fields" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT,
    "fieldType" TEXT DEFAULT 'TEXT', -- 'TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'JSON'
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "deal_custom_fields_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deal_custom_fields_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "deal_custom_fields_dealId_idx" ON "deal_custom_fields"("dealId");
CREATE INDEX IF NOT EXISTS "deal_custom_fields_fieldName_idx" ON "deal_custom_fields"("fieldName");
CREATE UNIQUE INDEX IF NOT EXISTS "deal_custom_fields_dealId_fieldName_unique" ON "deal_custom_fields"("dealId", "fieldName");

-- ============================================
-- 6. Create Deal Views Table (Saved Custom Views)
-- ============================================

CREATE TABLE IF NOT EXISTS "deal_views" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isShared" BOOLEAN DEFAULT false,
    "isDefault" BOOLEAN DEFAULT false,
    "filters" JSONB, -- Saved filter criteria
    "columns" JSONB, -- Which columns to display and their order
    "sortBy" TEXT,
    "sortOrder" TEXT DEFAULT 'ASC', -- 'ASC', 'DESC'
    "groupBy" TEXT, -- Optional grouping field
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "deal_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deal_views_userId_idx" ON "deal_views"("userId");
CREATE INDEX IF NOT EXISTS "deal_views_isShared_idx" ON "deal_views"("isShared");

-- ============================================
-- 7. Create Task Template Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "task_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT, -- 'ACQUISITION', 'DUE_DILIGENCE', 'FINANCING', 'CLOSING', 'POST_ACQUISITION', 'OTHER'
    "title" TEXT NOT NULL,
    "taskDescription" TEXT,
    "priority" TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    "estimatedDays" INTEGER, -- Estimated days to complete
    "isRequired" BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0, -- Order within template
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_templates_category_idx" ON "task_templates"("category");
CREATE INDEX IF NOT EXISTS "task_templates_createdBy_idx" ON "task_templates"("createdBy");
CREATE INDEX IF NOT EXISTS "task_templates_isActive_idx" ON "task_templates"("isActive");

-- Task Template Dependencies (which tasks depend on others)
CREATE TABLE IF NOT EXISTS "task_template_dependencies" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dependsOnTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "task_template_dependencies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "task_template_dependencies_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "task_templates"("id") ON DELETE CASCADE,
    CONSTRAINT "task_template_dependencies_dependsOnTemplateId_fkey" FOREIGN KEY ("dependsOnTemplateId") REFERENCES "task_templates"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "task_template_dependencies_templateId_idx" ON "task_template_dependencies"("templateId");
CREATE INDEX IF NOT EXISTS "task_template_dependencies_dependsOnTemplateId_idx" ON "task_template_dependencies"("dependsOnTemplateId");

-- ============================================
-- 8. Insert Initial Data (Universities)
-- ============================================

-- Insert Tulane University
INSERT INTO "universities" ("id", "name", "shortName", "city", "state", "zipCode", "latitude", "longitude", "enrollment", "website", "description", "isActive", "createdAt", "updatedAt")
VALUES (
    'tulane-university',
    'Tulane University',
    'Tulane',
    'New Orleans',
    'LA',
    '70118',
    29.9420,
    -90.1200,
    14000,
    'https://www.tulane.edu',
    'Private research university in New Orleans, Louisiana',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Insert Florida Atlantic University
INSERT INTO "universities" ("id", "name", "shortName", "city", "state", "zipCode", "latitude", "longitude", "enrollment", "website", "description", "isActive", "createdAt", "updatedAt")
VALUES (
    'florida-atlantic-university',
    'Florida Atlantic University',
    'FAU',
    'Boca Raton',
    'FL',
    '33431',
    26.3683,
    -80.1019,
    30000,
    'https://www.fau.edu',
    'Public research university in Boca Raton, Florida',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================

-- Add comments for documentation
COMMENT ON TABLE "universities" IS 'Universities near which Campus Rentals operates student housing';
COMMENT ON TABLE "document_templates" IS 'Templates for automated document generation (LOIs, tear sheets, etc.)';
COMMENT ON TABLE "document_generations" IS 'History of generated documents from templates';
COMMENT ON TABLE "excel_models" IS 'Excel underwriting models that sync with deals';
COMMENT ON TABLE "excel_field_mappings" IS 'Mappings between Excel columns and deal fields';
COMMENT ON TABLE "excel_syncs" IS 'History of Excel synchronization operations';
COMMENT ON TABLE "deal_custom_fields" IS 'Flexible custom fields for deals';
COMMENT ON TABLE "deal_views" IS 'Saved custom views and filters for deal lists';
COMMENT ON TABLE "task_templates" IS 'Reusable task templates for student housing workflows';

