-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('ACQUISITION', 'DEVELOPMENT', 'REFINANCE', 'DISPOSITION', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "DealPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dealType" "DealType" NOT NULL DEFAULT 'ACQUISITION',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" "DealPriority" NOT NULL DEFAULT 'MEDIUM',
    "pipelineId" TEXT,
    "stageId" TEXT,
    "propertyId" TEXT,
    "description" TEXT,
    "location" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "estimatedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "source" TEXT,
    "assignedToId" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_tasks" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "assignedToId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_notes" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_relationships" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "deal_tags" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "deal_pipeline_stages_pipelineId_idx" ON "deal_pipeline_stages"("pipelineId");

-- CreateIndex (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "deals_pipelineId_idx" ON "deals"("pipelineId");
CREATE INDEX IF NOT EXISTS "deals_stageId_idx" ON "deals"("stageId");
CREATE INDEX IF NOT EXISTS "deals_propertyId_idx" ON "deals"("propertyId");
CREATE INDEX IF NOT EXISTS "deals_assignedToId_idx" ON "deals"("assignedToId");

-- CreateIndex (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "deal_tasks_dealId_idx" ON "deal_tasks"("dealId");
CREATE INDEX IF NOT EXISTS "deal_tasks_assignedToId_idx" ON "deal_tasks"("assignedToId");

-- CreateIndex (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "deal_notes_dealId_idx" ON "deal_notes"("dealId");
CREATE INDEX IF NOT EXISTS "deal_notes_createdById_idx" ON "deal_notes"("createdById");

-- CreateIndex (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "deal_relationships_dealId_idx" ON "deal_relationships"("dealId");
CREATE INDEX IF NOT EXISTS "deal_relationships_contactId_idx" ON "deal_relationships"("contactId");
CREATE INDEX IF NOT EXISTS "deal_relationships_userId_idx" ON "deal_relationships"("userId");

-- CreateIndex (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "deal_tags_dealId_idx" ON "deal_tags"("dealId");
CREATE INDEX IF NOT EXISTS "deal_tags_tag_idx" ON "deal_tags"("tag");

-- AddForeignKey (only if table exists and foreign key doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_pipeline_stages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_pipeline_stages_pipelineId_fkey') THEN
            ALTER TABLE "deal_pipeline_stages" ADD CONSTRAINT "deal_pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "deal_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey (only if table exists and foreign key doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deals_pipelineId_fkey') THEN
            ALTER TABLE "deals" ADD CONSTRAINT "deals_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "deal_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deals_stageId_fkey') THEN
            ALTER TABLE "deals" ADD CONSTRAINT "deals_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "deal_pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deals_propertyId_fkey') THEN
            ALTER TABLE "deals" ADD CONSTRAINT "deals_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deals_assignedToId_fkey') THEN
            ALTER TABLE "deals" ADD CONSTRAINT "deals_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey (only if table exists and foreign key doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_tasks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_tasks_dealId_fkey') THEN
            ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_tasks_assignedToId_fkey') THEN
            ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey (only if table exists and foreign key doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_notes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_notes_dealId_fkey') THEN
            ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_notes_createdById_fkey') THEN
            ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey (only if table exists and foreign key doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_relationships') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_relationships_dealId_fkey') THEN
            ALTER TABLE "deal_relationships" ADD CONSTRAINT "deal_relationships_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_relationships_contactId_fkey') THEN
            ALTER TABLE "deal_relationships" ADD CONSTRAINT "deal_relationships_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_relationships_userId_fkey') THEN
            ALTER TABLE "deal_relationships" ADD CONSTRAINT "deal_relationships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey (only if table exists and foreign key doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_tags') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_tags_dealId_fkey') THEN
            ALTER TABLE "deal_tags" ADD CONSTRAINT "deal_tags_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Create unique constraint (only if it doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_tags') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_tags_dealId_tag_key') THEN
            ALTER TABLE "deal_tags" ADD CONSTRAINT "deal_tags_dealId_tag_key" UNIQUE ("dealId", "tag");
        END IF;
    END IF;
END $$;

