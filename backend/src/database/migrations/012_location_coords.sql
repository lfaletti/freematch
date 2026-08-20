-- Migration 012: Location coordinates for distance-based matching.
--
-- `users.location` stays a human-readable string ("Buenos Aires, AR") shown on
-- profiles. `latitude`/`longitude` hold the CITY CENTROID returned by Geoapify
-- when the user picks their city — NOT their exact position. This keeps the
-- privacy posture (no continuous tracking, no exact location) while letting the
-- swipe deck order results by distance.
--
-- NULL = legacy account created before coordinates were captured.

ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_users_lat_lng
  ON users(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
