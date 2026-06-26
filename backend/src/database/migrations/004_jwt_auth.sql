ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_real
  ON users(email)
  WHERE email IS NOT NULL AND is_mock = false;
