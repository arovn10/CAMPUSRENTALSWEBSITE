-- Add section field to deals (ACQUISITION, DEVELOPMENT, ASSET_MANAGEMENT)
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "section" TEXT DEFAULT 'ACQUISITION';
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "underwritingData" JSONB;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "dueDiligenceStatus" TEXT DEFAULT 'NOT_STARTED';
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "budgetedCost" DOUBLE PRECISION;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "actualCost" DOUBLE PRECISION;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "completionDate" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "occupancyRate" DOUBLE PRECISION;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "noi" DOUBLE PRECISION;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "capRate" DOUBLE PRECISION;

-- Create Development Timeline model
CREATE TABLE IF NOT EXISTS "development_timelines" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "dependencies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_timelines_pkey" PRIMARY KEY ("id")
);

-- Create Budget Line Items model
CREATE TABLE IF NOT EXISTS "budget_line_items" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_line_items_pkey" PRIMARY KEY ("id")
);

-- Create Underwriting Data model
CREATE TABLE IF NOT EXISTS "underwriting_data" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "propertyType" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "loanAmount" DOUBLE PRECISION,
    "loanRate" DOUBLE PRECISION,
    "loanTerm" INTEGER,
    "downPayment" DOUBLE PRECISION,
    "grossRent" DOUBLE PRECISION,
    "vacancyRate" DOUBLE PRECISION,
    "operatingExpenses" DOUBLE PRECISION,
    "noi" DOUBLE PRECISION,
    "capRate" DOUBLE PRECISION,
    "irr" DOUBLE PRECISION,
    "cashOnCash" DOUBLE PRECISION,
    "debtServiceCoverage" DOUBLE PRECISION,
    "additionalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "underwriting_data_pkey" PRIMARY KEY ("id")
);

-- Create Due Diligence Checklist model
CREATE TABLE IF NOT EXISTS "due_diligence_items" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "due_diligence_items_pkey" PRIMARY KEY ("id")
);

-- Create Asset Metrics model
CREATE TABLE IF NOT EXISTS "asset_metrics" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "occupancyRate" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "expenses" DOUBLE PRECISION,
    "noi" DOUBLE PRECISION,
    "capRate" DOUBLE PRECISION,
    "debtService" DOUBLE PRECISION,
    "cashFlow" DOUBLE PRECISION,
    "additionalMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_metrics_pkey" PRIMARY KEY ("id")
);

-- Create Vendor Relationship model
CREATE TABLE IF NOT EXISTS "vendor_relationships" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT,
    "vendorName" TEXT NOT NULL,
    "vendorType" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "services" TEXT[],
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_relationships_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "development_timelines_dealId_idx" ON "development_timelines"("dealId");
CREATE INDEX IF NOT EXISTS "budget_line_items_dealId_idx" ON "budget_line_items"("dealId");
CREATE INDEX IF NOT EXISTS "underwriting_data_dealId_idx" ON "underwriting_data"("dealId");
CREATE INDEX IF NOT EXISTS "due_diligence_items_dealId_idx" ON "due_diligence_items"("dealId");
CREATE INDEX IF NOT EXISTS "asset_metrics_dealId_idx" ON "asset_metrics"("dealId");
CREATE INDEX IF NOT EXISTS "vendor_relationships_dealId_idx" ON "vendor_relationships"("dealId");
CREATE INDEX IF NOT EXISTS "deals_section_idx" ON "deals"("section");

