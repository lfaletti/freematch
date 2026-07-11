-- Migration 007: Email verification support

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Index for checking unverified accounts
CREATE INDEX IF NOT EXISTS idx_users_email_unverified
  ON users(email)
  WHERE email IS NOT NULL AND email_verified = false;
