-- Phase 7: Enhanced CRM Features
-- Adds advanced CRM features for contact management and relationship tracking

-- ============================================
-- 1. Contact Interactions Table (Track all interactions)
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_interactions" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL, -- References contacts table
    "dealId" TEXT, -- References deals table (if interaction is deal-related)
    "interactionType" TEXT NOT NULL, -- 'EMAIL', 'CALL', 'MEETING', 'NOTE', 'TASK', 'DOCUMENT'
    "subject" TEXT,
    "description" TEXT,
    "interactionDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER, -- Duration in minutes
    "outcome" TEXT, -- 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FOLLOW_UP_NEEDED'
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "contact_interactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_interactions_contactId_idx" ON "contact_interactions"("contactId");
CREATE INDEX IF NOT EXISTS "contact_interactions_dealId_idx" ON "contact_interactions"("dealId");
CREATE INDEX IF NOT EXISTS "contact_interactions_interactionType_idx" ON "contact_interactions"("interactionType");
CREATE INDEX IF NOT EXISTS "contact_interactions_interactionDate_idx" ON "contact_interactions"("interactionDate");

-- ============================================
-- 2. Contact Segments Table (For segmentation)
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL, -- Segmentation criteria
    "contactCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "contact_segments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_segments_isActive_idx" ON "contact_segments"("isActive");

-- ============================================
-- 3. Contact Segment Members Table
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_segment_members" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL, -- References contact_segments
    "contactId" TEXT NOT NULL, -- References contacts table
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "contact_segment_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_segment_members_segmentId_idx" ON "contact_segment_members"("segmentId");
CREATE INDEX IF NOT EXISTS "contact_segment_members_contactId_idx" ON "contact_segment_members"("contactId");
CREATE UNIQUE INDEX IF NOT EXISTS "contact_segment_members_segmentId_contactId_key" ON "contact_segment_members"("segmentId", "contactId");

-- ============================================
-- 4. Contact Tags Table
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_tags" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL, -- References contacts table
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_tags_contactId_idx" ON "contact_tags"("contactId");
CREATE INDEX IF NOT EXISTS "contact_tags_tag_idx" ON "contact_tags"("tag");
CREATE UNIQUE INDEX IF NOT EXISTS "contact_tags_contactId_tag_key" ON "contact_tags"("contactId", "tag");

-- ============================================
-- 5. Contact Custom Fields Table
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_custom_fields" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL, -- References contacts table
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT,
    "fieldType" TEXT DEFAULT 'TEXT', -- 'TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'JSON'
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "contact_custom_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_custom_fields_contactId_idx" ON "contact_custom_fields"("contactId");
CREATE INDEX IF NOT EXISTS "contact_custom_fields_fieldName_idx" ON "contact_custom_fields"("fieldName");
CREATE UNIQUE INDEX IF NOT EXISTS "contact_custom_fields_contactId_fieldName_key" ON "contact_custom_fields"("contactId", "fieldName");

-- ============================================
-- 6. Contact Relationships Table (Track relationships between contacts)
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_relationships" (
    "id" TEXT NOT NULL,
    "contactId1" TEXT NOT NULL, -- References contacts table
    "contactId2" TEXT NOT NULL, -- References contacts table
    "relationshipType" TEXT NOT NULL, -- 'COLLEAGUE', 'PARTNER', 'REFERRAL', 'FAMILY', 'CUSTOM'
    "description" TEXT,
    "strength" TEXT DEFAULT 'MEDIUM', -- 'WEAK', 'MEDIUM', 'STRONG'
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "contact_relationships_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_relationships_contactId1_idx" ON "contact_relationships"("contactId1");
CREATE INDEX IF NOT EXISTS "contact_relationships_contactId2_idx" ON "contact_relationships"("contactId2");
CREATE INDEX IF NOT EXISTS "contact_relationships_relationshipType_idx" ON "contact_relationships"("relationshipType");

-- ============================================
-- 7. Email Integration Table (Track emails from contacts)
-- ============================================

CREATE TABLE IF NOT EXISTS "contact_emails" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL, -- References contacts table
    "dealId" TEXT, -- References deals table (if email is deal-related)
    "messageId" TEXT, -- Email message ID
    "threadId" TEXT, -- Email thread ID
    "subject" TEXT,
    "body" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "isRead" BOOLEAN DEFAULT false,
    "isReplied" BOOLEAN DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "contact_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_emails_contactId_idx" ON "contact_emails"("contactId");
CREATE INDEX IF NOT EXISTS "contact_emails_dealId_idx" ON "contact_emails"("dealId");
CREATE INDEX IF NOT EXISTS "contact_emails_messageId_idx" ON "contact_emails"("messageId");
CREATE INDEX IF NOT EXISTS "contact_emails_threadId_idx" ON "contact_emails"("threadId");
CREATE INDEX IF NOT EXISTS "contact_emails_receivedAt_idx" ON "contact_emails"("receivedAt");

-- ============================================
-- 8. Add missing fields to contacts table if needed
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'leadSource') THEN
        ALTER TABLE "contacts" ADD COLUMN "leadSource" TEXT;
        COMMENT ON COLUMN "contacts"."leadSource" IS 'Where this contact came from';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'leadScore') THEN
        ALTER TABLE "contacts" ADD COLUMN "leadScore" INTEGER DEFAULT 0;
        COMMENT ON COLUMN "contacts"."leadScore" IS 'Lead score (0-100)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'lastInteractionDate') THEN
        ALTER TABLE "contacts" ADD COLUMN "lastInteractionDate" TIMESTAMP(3);
        COMMENT ON COLUMN "contacts"."lastInteractionDate" IS 'Date of last interaction with contact';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'nextFollowUpDate') THEN
        ALTER TABLE "contacts" ADD COLUMN "nextFollowUpDate" TIMESTAMP(3);
        COMMENT ON COLUMN "contacts"."nextFollowUpDate" IS 'Date for next follow-up';
    END IF;
END $$;

