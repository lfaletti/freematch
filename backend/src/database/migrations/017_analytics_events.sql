-- Migration 017: Analytics events.
--
-- Lightweight, self-hosted product analytics (no third-party PII). We record the
-- handful of events the owner cares about right now: whether there is activity on
-- the app and whether matches are happening.
--
-- Events tracked (defined by analyticsService/track callers):
--   register     - a new account was created (userService.registerUser)
--   login        - an account logged in (authService.loginUser + phone login)
--   app_open     - an authenticated app session started (frontend -> POST /analytics/track)
--   match        - two people mutually liked -> a match was created (matchService.createMatch)
--
-- Events are append-only. A "tap" on register/login/match is recorded by the
-- backend inside the code path that already makes them happen (so it can't be
-- spoofed/duplicated by clients freely); app_open is the only client-initiated
-- one and is rate-limited + authenticated.
--
-- Columns:
--   id, user_id (nullable FK -> users, ON DELETE SET NULL so deleting an account
--      keeps the aggregate counters but unlinks the row), event (text), metadata
--      (JSONB, optional extra context such as swipe direction), created_at.
--
-- This file is idempotent on purpose (runMigrations() re-runs every file on
-- boot), so every statement must be safe to re-apply.

CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Typical query patterns: aggregate one event over a time window (last day/week),
-- or count distinct active user_ids. Partial index on most-recent events to keep
-- the hot path small. (CREATE INDEX IF NOT EXISTS IS supported, unlike constraints.)
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created_at
  ON analytics_events (event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created_at
  ON analytics_events (user_id, created_at DESC);
