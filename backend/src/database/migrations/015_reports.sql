-- Migration 015: User reports (moderation groundwork)
--
-- A user can report a conversation partner from the chat. The report is stored
-- for later triage by the owner/admin (a dedicated review panel / admin email
-- digest is deliberately OUT of scope for this iteration -- listing them later
-- just queries this table).
--
-- Reporting ALSO permanently removes the reported user from the reporting
-- user's swipe deck (see getAllUsers exclusion). It does NOT ban the reported
-- user globally, and the reported user is never told a report was filed (the
-- match just disappears, identical to an unmatch from their side).
--
-- `reason` stores a stable machine key (not localized text) so the frontend
-- maps a key -> localized label. `details` is optional free text / evidence
-- (e.g. the offending message, pasted by the reporter).

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  reason VARCHAR(40) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Clean up a user's reports when their account is deleted (right to erasure,
-- mirrors the cascade pattern applied to swipes/matches in 011_privacy.sql).
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reported_id_fkey
  FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

-- One report per (reporter, reported) pair is enough for the deck-exclusion
-- rule; repeat reporting would just spam this table.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_reporter_reported
  ON reports(reporter_id, reported_id);
