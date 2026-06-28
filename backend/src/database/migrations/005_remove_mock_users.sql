-- Migration 005: Remove all auto-generated (mock) users and their dependent data.
-- The app must only ever contain accounts created manually via registration
-- (is_mock = false). This runs on every startup and is idempotent — once the
-- mock users are gone there is nothing left to delete.

-- Matches that involve a mock user (cascades to their messages).
DELETE FROM matches
  WHERE user1_id IN (SELECT id FROM users WHERE is_mock = true)
     OR user2_id IN (SELECT id FROM users WHERE is_mock = true);

-- Swipes to/from a mock user (FK on swiped_id is RESTRICT, so clear before users).
DELETE FROM swipes
  WHERE swiper_id IN (SELECT id FROM users WHERE is_mock = true)
     OR swiped_id IN (SELECT id FROM users WHERE is_mock = true);

-- The mock users themselves (cascades to their photos).
DELETE FROM users WHERE is_mock = true;
