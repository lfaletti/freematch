-- Add gender and seeking_gender to users table
-- gender: 'man', 'woman', 'other' (required)
-- seeking_gender: array of genders the user wants to see (required)

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('man', 'woman', 'other'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS seeking_gender TEXT[] DEFAULT '{man,woman,other}';

-- Make gender required for future inserts (existing rows will be NULL until user sets it)
-- We don't add NOT NULL yet so existing users aren't broken; the app flow enforces it.
