-- Migration 013: Search radius for the swipe deck.
--
-- Each user picks how far (in km) they want to see people from their chosen
-- city. The deck then shows ONLY candidates within this radius. NULL = legacy
-- account (pre-radius) — those fall back to ordering-only (no hard filter) so
-- existing users keep seeing people.

ALTER TABLE users ADD COLUMN IF NOT EXISTS search_radius_km INTEGER;
