-- Migration 011: Privacy policy consent + FK cascades for account deletion
--
-- 1) Record when a user accepted the Privacy Policy / Terms of Service at
--    registration (GDPR "consent"). NULL means they pre-date this migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- 2) Add ON DELETE CASCADE to the swipes/matches FKs that point at users(id)
--    so a row in `users` can be removed cleanly (right to erasure, GDPR art.
--    17). Postgres auto-names these <table>_<column>_fkey, so we drop and
--    re-add them. Guarded with a DO block so the migration is idempotent even
--    if it's ever re-run against a DB where some were already converted.
DO $$
BEGIN
  -- swipes.swiper_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'swipes_swiper_id_fkey') THEN
    ALTER TABLE swipes DROP CONSTRAINT swipes_swiper_id_fkey;
  END IF;
  ALTER TABLE swipes ADD CONSTRAINT swipes_swiper_id_fkey
    FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE;

  -- swipes.swiped_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'swipes_swiped_id_fkey') THEN
    ALTER TABLE swipes DROP CONSTRAINT swipes_swiped_id_fkey;
  END IF;
  ALTER TABLE swipes ADD CONSTRAINT swipes_swiped_id_fkey
    FOREIGN KEY (swiped_id) REFERENCES users(id) ON DELETE CASCADE;

  -- matches.user1_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_user1_id_fkey') THEN
    ALTER TABLE matches DROP CONSTRAINT matches_user1_id_fkey;
  END IF;
  ALTER TABLE matches ADD CONSTRAINT matches_user1_id_fkey
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE;

  -- matches.user2_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_user2_id_fkey') THEN
    ALTER TABLE matches DROP CONSTRAINT matches_user2_id_fkey;
  END IF;
  ALTER TABLE matches ADD CONSTRAINT matches_user2_id_fkey
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;
