-- Migration 016: Preferred match age range for the swipe deck.
--
-- Each user picks the min/max age they want to see in their deck. The deck
-- then shows ONLY candidates whose age falls within [age_min, age_max].
-- NULL = legacy account or not set — those fall back to no age filter (the
-- existing gender + radius filters still apply), so current users keep seeing
-- people. Defaults are 18 and 99 so the UI has a sane starting point.
--
-- NOTE: idempotent on purpose — runMigrations() re-runs every migration file on
-- every boot (there is no run-tracking table), so each statement must be safe
-- to apply repeatedly. ADD COLUMN IF NOT EXISTS is supported by PostgreSQL;
-- ADD CONSTRAINT IF NOT EXISTS is NOT, so we keep constraint enforcement in the
-- app code (register / PATCH validation) instead of the schema. This file must
-- never contain a statement that is not re-runnable.

ALTER TABLE users ADD COLUMN IF NOT EXISTS age_min INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_max INTEGER;
