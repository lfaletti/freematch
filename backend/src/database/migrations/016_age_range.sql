-- Migration 016: Preferred match age range for the swipe deck.
--
-- Each user picks the min/max age they want to see in their deck. The deck
-- then shows ONLY candidates whose age falls within [age_min, age_max].
-- NULL = legacy account or not set — those fall back to no age filter (the
-- existing gender + radius filters still apply), so current users keep seeing
-- people. Defaults are 18 and 99 so the UI has a sane starting point.

ALTER TABLE users ADD COLUMN IF NOT EXISTS age_min INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_max INTEGER;

-- Keep the stored range sane if it somehow gets written (UI/backend already
-- enforce 18..120 and min<=max).
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_age_min_ck CHECK (age_min IS NULL OR (age_min >= 18 AND age_min <= 120));
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_age_max_ck CHECK (age_max IS NULL OR (age_max >= 18 AND age_max <= 120));
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_age_range_ck CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max);
