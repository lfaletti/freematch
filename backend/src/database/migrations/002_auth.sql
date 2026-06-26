-- Migration 002: Replace age with born_date, add phone/email for real accounts

ALTER TABLE users ADD COLUMN IF NOT EXISTS born_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE users DROP COLUMN IF EXISTS age;

-- Unique phone constraint only for real (non-mock) accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_real
  ON users(phone_number)
  WHERE phone_number IS NOT NULL AND is_mock = false;
