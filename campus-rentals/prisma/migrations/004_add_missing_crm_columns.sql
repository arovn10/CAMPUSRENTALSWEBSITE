-- Add missing columns to existing CRM tables

-- Add assignedToId to deals table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'assignedToId') THEN
        ALTER TABLE "deals" ADD COLUMN "assignedToId" TEXT;
        CREATE INDEX IF NOT EXISTS "deals_assignedToId_idx" ON "deals"("assignedToId");
        ALTER TABLE "deals" ADD CONSTRAINT "deals_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add assignedToId to deal_tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_tasks' AND column_name = 'assignedToId') THEN
        ALTER TABLE "deal_tasks" ADD COLUMN "assignedToId" TEXT;
        CREATE INDEX IF NOT EXISTS "deal_tasks_assignedToId_idx" ON "deal_tasks"("assignedToId");
        ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add createdById to deal_notes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_notes' AND column_name = 'createdById') THEN
        ALTER TABLE "deal_notes" ADD COLUMN "createdById" TEXT NOT NULL DEFAULT '';
        CREATE INDEX IF NOT EXISTS "deal_notes_createdById_idx" ON "deal_notes"("createdById");
        ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add userId to deal_relationships table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_relationships' AND column_name = 'userId') THEN
        ALTER TABLE "deal_relationships" ADD COLUMN "userId" TEXT;
        CREATE INDEX IF NOT EXISTS "deal_relationships_userId_idx" ON "deal_relationships"("userId");
        ALTER TABLE "deal_relationships" ADD CONSTRAINT "deal_relationships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

