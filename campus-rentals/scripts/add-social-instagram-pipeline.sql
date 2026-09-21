-- Campus Rentals Instagram content pipeline (@campusrentalsllc).
--
-- Additive and idempotent: CREATE ... IF NOT EXISTS plus guarded enum/FK
-- creation. Touches no existing table except to add a foreign key FROM the new
-- social_posts table TO users. Safe to re-run.
--
-- Mirrors the Prisma models SocialPost / SocialPostInsight /
-- SocialAccountSnapshot / SocialCredential. See docs/INSTAGRAM-PIPELINE.md.

DO $$ BEGIN
  CREATE TYPE "SocialPostKind" AS ENUM ('LISTING', 'PHOTO_FEATURE', 'DEVELOPMENT', 'NEIGHBORHOOD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SocialMediaFormat" AS ENUM ('IMAGE', 'CAROUSEL', 'REEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'REJECTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "social_posts" (
    "id"              TEXT NOT NULL,
    "kind"            "SocialPostKind" NOT NULL,
    "format"          "SocialMediaFormat" NOT NULL,
    "status"          "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "caption"         TEXT NOT NULL,
    "hashtags"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mediaUrls"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "altText"         TEXT,
    "sourceKey"       TEXT NOT NULL,
    "sourceRef"       TEXT,
    "scheduledFor"    TIMESTAMP(3),
    "publishedAt"     TIMESTAMP(3),
    "igMediaId"       TEXT,
    "igPermalink"     TEXT,
    "reviewedBy"      TEXT,
    "reviewedAt"      TIMESTAMP(3),
    "rejectionReason" TEXT,
    "failureReason"   TEXT,
    "attemptCount"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_posts_sourceKey_key" ON "social_posts"("sourceKey");
CREATE INDEX IF NOT EXISTS "social_posts_status_idx" ON "social_posts"("status");
CREATE INDEX IF NOT EXISTS "social_posts_kind_idx" ON "social_posts"("kind");
CREATE INDEX IF NOT EXISTS "social_posts_publishedAt_idx" ON "social_posts"("publishedAt");
CREATE INDEX IF NOT EXISTS "social_posts_reviewedBy_idx" ON "social_posts"("reviewedBy");

DO $$ BEGIN
  ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "social_post_insights" (
    "id"                TEXT NOT NULL,
    "postId"            TEXT NOT NULL,
    "igMediaId"         TEXT NOT NULL,
    "reach"             INTEGER NOT NULL DEFAULT 0,
    "likes"             INTEGER NOT NULL DEFAULT 0,
    "comments"          INTEGER NOT NULL DEFAULT 0,
    "saved"             INTEGER NOT NULL DEFAULT 0,
    "shares"            INTEGER NOT NULL DEFAULT 0,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "capturedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_post_insights_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_post_insights_igMediaId_capturedAt_key"
  ON "social_post_insights"("igMediaId", "capturedAt");
CREATE INDEX IF NOT EXISTS "social_post_insights_postId_idx" ON "social_post_insights"("postId");

DO $$ BEGIN
  ALTER TABLE "social_post_insights" ADD CONSTRAINT "social_post_insights_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "social_account_snapshots" (
    "id"           TEXT NOT NULL,
    "igUserId"     TEXT NOT NULL,
    "followers"    INTEGER NOT NULL,
    "follows"      INTEGER NOT NULL DEFAULT 0,
    "mediaCount"   INTEGER NOT NULL,
    "capturedHour" TEXT NOT NULL,
    "capturedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_account_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_account_snapshots_capturedHour_key"
  ON "social_account_snapshots"("capturedHour");
CREATE INDEX IF NOT EXISTS "social_account_snapshots_capturedAt_idx"
  ON "social_account_snapshots"("capturedAt");

CREATE TABLE IF NOT EXISTS "social_credentials" (
    "id"              TEXT NOT NULL,
    "provider"        TEXT NOT NULL,
    "igUserId"        TEXT,
    "accessToken"     TEXT NOT NULL,
    "expiresAt"       TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "refreshFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_credentials_provider_key" ON "social_credentials"("provider");
