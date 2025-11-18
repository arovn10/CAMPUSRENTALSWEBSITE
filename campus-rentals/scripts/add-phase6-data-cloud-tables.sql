-- Phase 6: Data Cloud Tables
-- Adds tables for external data source connections and synchronization

-- ============================================
-- 1. Data Sources Table
-- ============================================

CREATE TABLE IF NOT EXISTS "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL, -- 'API', 'DATABASE', 'FILE', 'EXCEL', 'CSV', 'GOOGLE_SHEETS'
    "connectionConfig" JSONB NOT NULL, -- Connection configuration (encrypted credentials)
    "syncFrequency" TEXT, -- 'REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'
    "lastSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_sources_sourceType_idx" ON "data_sources"("sourceType");
CREATE INDEX IF NOT EXISTS "data_sources_isActive_idx" ON "data_sources"("isActive");
CREATE INDEX IF NOT EXISTS "data_sources_nextSyncAt_idx" ON "data_sources"("nextSyncAt");

-- ============================================
-- 2. Data Syncs Table (Sync history)
-- ============================================

CREATE TABLE IF NOT EXISTS "data_syncs" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL, -- References data_sources
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'
    "recordsProcessed" INTEGER DEFAULT 0,
    "recordsCreated" INTEGER DEFAULT 0,
    "recordsUpdated" INTEGER DEFAULT 0,
    "recordsDeleted" INTEGER DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER, -- Duration in seconds
    
    CONSTRAINT "data_syncs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_syncs_dataSourceId_idx" ON "data_syncs"("dataSourceId");
CREATE INDEX IF NOT EXISTS "data_syncs_status_idx" ON "data_syncs"("status");
CREATE INDEX IF NOT EXISTS "data_syncs_startedAt_idx" ON "data_syncs"("startedAt");

-- ============================================
-- 3. Data Mappings Table (Field mappings)
-- ============================================

CREATE TABLE IF NOT EXISTS "data_mappings" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL, -- References data_sources
    "sourceField" TEXT NOT NULL, -- Field name in source
    "targetEntity" TEXT NOT NULL, -- 'DEAL', 'PROPERTY', 'CONTACT', 'TASK', etc.
    "targetField" TEXT NOT NULL, -- Field name in target
    "transformation" TEXT, -- Transformation rule (e.g., 'UPPERCASE', 'DATE_FORMAT', 'CUSTOM')
    "transformationConfig" JSONB, -- Configuration for transformation
    "isRequired" BOOLEAN DEFAULT false,
    "defaultValue" TEXT,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "data_mappings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_mappings_dataSourceId_idx" ON "data_mappings"("dataSourceId");
CREATE INDEX IF NOT EXISTS "data_mappings_targetEntity_idx" ON "data_mappings"("targetEntity");

-- ============================================
-- 4. Data Transformations Table (Custom transformation rules)
-- ============================================

CREATE TABLE IF NOT EXISTS "data_transformations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transformationType" TEXT NOT NULL, -- 'SCRIPT', 'FORMULA', 'LOOKUP', 'AGGREGATE'
    "code" TEXT, -- Transformation code/script
    "language" TEXT DEFAULT 'JAVASCRIPT', -- 'JAVASCRIPT', 'SQL', 'PYTHON'
    "parameters" JSONB, -- Input parameters
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "data_transformations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_transformations_transformationType_idx" ON "data_transformations"("transformationType");
CREATE INDEX IF NOT EXISTS "data_transformations_isActive_idx" ON "data_transformations"("isActive");

-- ============================================
-- 5. Data Reports Table (Generated reports from data cloud)
-- ============================================

CREATE TABLE IF NOT EXISTS "data_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" TEXT NOT NULL, -- 'ANALYTICS', 'COMPARISON', 'TREND', 'CUSTOM'
    "dataSourceIds" TEXT[], -- Array of data source IDs used
    "query" JSONB, -- Report query/filters
    "visualization" JSONB, -- Visualization configuration
    "isScheduled" BOOLEAN DEFAULT false,
    "scheduleConfig" JSONB, -- Schedule configuration
    "lastGeneratedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "data_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_reports_reportType_idx" ON "data_reports"("reportType");
CREATE INDEX IF NOT EXISTS "data_reports_createdBy_idx" ON "data_reports"("createdBy");
CREATE INDEX IF NOT EXISTS "data_reports_isScheduled_idx" ON "data_reports"("isScheduled");

