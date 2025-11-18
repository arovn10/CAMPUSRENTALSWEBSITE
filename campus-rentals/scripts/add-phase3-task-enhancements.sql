-- Phase 3: Enhanced Task Management
-- Adds task automation, comments, attachments, and advanced task features

-- ============================================
-- 1. Task Comments Table
-- ============================================

CREATE TABLE IF NOT EXISTS "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_comments_taskId_idx" ON "task_comments"("taskId");
CREATE INDEX IF NOT EXISTS "task_comments_userId_idx" ON "task_comments"("userId");
CREATE INDEX IF NOT EXISTS "task_comments_createdAt_idx" ON "task_comments"("createdAt");

-- ============================================
-- 2. Task Attachments Table
-- ============================================

CREATE TABLE IF NOT EXISTS "task_attachments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "s3Key" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_attachments_taskId_idx" ON "task_attachments"("taskId");
CREATE INDEX IF NOT EXISTS "task_attachments_uploadedBy_idx" ON "task_attachments"("uploadedBy");

-- ============================================
-- 3. Task Automation Rules Table
-- ============================================

CREATE TABLE IF NOT EXISTS "task_automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL, -- 'DEAL_STAGE_CHANGE', 'TASK_COMPLETED', 'DATE', 'MANUAL'
    "triggerConfig" JSONB, -- Configuration for the trigger
    "actionType" TEXT NOT NULL, -- 'CREATE_TASK', 'ASSIGN_TASK', 'UPDATE_TASK', 'SEND_EMAIL'
    "actionConfig" JSONB NOT NULL, -- Configuration for the action
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "task_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_automation_rules_triggerType_idx" ON "task_automation_rules"("triggerType");
CREATE INDEX IF NOT EXISTS "task_automation_rules_isActive_idx" ON "task_automation_rules"("isActive");

-- ============================================
-- 4. Task Time Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS "task_time_entries" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER, -- Duration in minutes
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "task_time_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_time_entries_taskId_idx" ON "task_time_entries"("taskId");
CREATE INDEX IF NOT EXISTS "task_time_entries_userId_idx" ON "task_time_entries"("userId");

-- ============================================
-- 5. Task Checklists Table (sub-tasks)
-- ============================================

CREATE TABLE IF NOT EXISTS "task_checklist_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_checklist_items_taskId_idx" ON "task_checklist_items"("taskId");
CREATE INDEX IF NOT EXISTS "task_checklist_items_isCompleted_idx" ON "task_checklist_items"("isCompleted");

-- ============================================
-- 6. Add missing fields to existing deal_tasks table if needed
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_tasks' AND column_name = 'estimatedHours') THEN
        ALTER TABLE "deal_tasks" ADD COLUMN "estimatedHours" DOUBLE PRECISION;
        COMMENT ON COLUMN "deal_tasks"."estimatedHours" IS 'Estimated hours to complete task';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_tasks' AND column_name = 'actualHours') THEN
        ALTER TABLE "deal_tasks" ADD COLUMN "actualHours" DOUBLE PRECISION;
        COMMENT ON COLUMN "deal_tasks"."actualHours" IS 'Actual hours spent on task';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_tasks' AND column_name = 'recurrenceRule') THEN
        ALTER TABLE "deal_tasks" ADD COLUMN "recurrenceRule" TEXT;
        COMMENT ON COLUMN "deal_tasks"."recurrenceRule" IS 'Recurrence rule for repeating tasks (RRULE format)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_tasks' AND column_name = 'parentTaskId') THEN
        ALTER TABLE "deal_tasks" ADD COLUMN "parentTaskId" TEXT;
        COMMENT ON COLUMN "deal_tasks"."parentTaskId" IS 'Parent task ID for sub-tasks';
    END IF;
END $$;

-- Add foreign key for parent task if column was just created
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_tasks' AND column_name = 'parentTaskId') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deal_tasks_parentTaskId_fkey') THEN
        ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_parentTaskId_fkey" 
            FOREIGN KEY ("parentTaskId") REFERENCES "deal_tasks"("id") ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "deal_tasks_parentTaskId_idx" ON "deal_tasks"("parentTaskId");

