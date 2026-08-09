-- Add language preference to users table
-- language: 'es' (Spanish, default) or 'en' (English)
-- The UI reads this to decide which locale to render.

ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'es'
  CHECK (language IN ('es', 'en'));
