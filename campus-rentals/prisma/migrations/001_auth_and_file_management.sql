-- Migration: Add comprehensive authentication and file management
-- This migration adds all the new models for authentication, file management, and email functionality

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zipCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ssn" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id")
);

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS "file_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL UNIQUE,
    "category" TEXT NOT NULL,
    "isPublic" BOOLEAN DEFAULT false,
    "metadata" JSONB,
    "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id")
);

-- Create file_shares table
CREATE TABLE IF NOT EXISTS "file_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedWith" TEXT,
    "shareToken" TEXT NOT NULL UNIQUE,
    "permissions" TEXT NOT NULL,
    "expiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS "email_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isEncrypted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_token" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_userId" ON "password_reset_tokens"("userId");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_token" ON "email_verification_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_userId" ON "email_verification_tokens"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_userId" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_createdAt" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_file_uploads_userId" ON "file_uploads"("userId");
CREATE INDEX IF NOT EXISTS "idx_file_uploads_category" ON "file_uploads"("category");
CREATE INDEX IF NOT EXISTS "idx_file_uploads_fileHash" ON "file_uploads"("fileHash");
CREATE INDEX IF NOT EXISTS "idx_file_shares_shareToken" ON "file_shares"("shareToken");
CREATE INDEX IF NOT EXISTS "idx_email_logs_status" ON "email_logs"("status");
CREATE INDEX IF NOT EXISTS "idx_email_logs_createdAt" ON "email_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");
CREATE INDEX IF NOT EXISTS "idx_system_settings_category" ON "system_settings"("category");

-- Insert default system settings
INSERT INTO "system_settings" ("id", "key", "value", "description", "category") VALUES
('smtp_host', 'SMTP_HOST', 'smtp.gmail.com', 'SMTP server host', 'email'),
('smtp_port', 'SMTP_PORT', '587', 'SMTP server port', 'email'),
('smtp_secure', 'SMTP_SECURE', 'false', 'Use secure SMTP connection', 'email'),
('smtp_user', 'SMTP_USER', '', 'SMTP username', 'email'),
('smtp_pass', 'SMTP_PASS', '', 'SMTP password', 'email'),
('from_email', 'FROM_EMAIL', 'noreply@campusrentals.cc', 'Default from email address', 'email'),
('support_email', 'SUPPORT_EMAIL', 'support@campusrentals.cc', 'Support email address', 'email'),
('app_name', 'APP_NAME', 'Campus Rentals LLC', 'Application name', 'general'),
('app_url', 'APP_URL', 'https://campusrentals.cc', 'Application URL', 'general')
ON CONFLICT ("key") DO NOTHING;
