CREATE TABLE IF NOT EXISTS plaza_waitlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  interest TEXT NOT NULL,
  message TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "plaza_waitlist_createdAt_idx" ON plaza_waitlist ("createdAt");
-- Campus Rentals Plaza waitlist (2026-07-13). Idempotent; comments trail the
-- statements because the runner skips comment-led statements.
