import { query } from '../database/connection';
import { REQUIRES_VERIFICATION_SINCE } from './authService';

const SESSION_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getOrCreateSessionUser(): Promise<string> {
  return SESSION_USER_ID;
}

export async function getAllUsers(sessionUserId: string, limit: number, offset: number) {
  const result = await query(
    `WITH my_user AS (
      SELECT 
        COALESCE(gender, 'other') as gender, 
        COALESCE(seeking_gender, '{man,woman,other}'::text[]) as seeking_gender,
        email_verified,
        created_at,
        latitude,
        longitude,
        search_radius_km
      FROM users WHERE id = $1
    ),
    ranked AS (
      SELECT u.id, u.name, u.bio, u.born_date, u.interests, u.location, u.is_mock,
         u.gender, u.seeking_gender, u.language, u.created_at,
         COALESCE(u.photo_url, (SELECT p.url FROM photos p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
         EXTRACT(YEAR FROM AGE(u.born_date))::integer AS age,
         my_user.search_radius_km AS my_radius,
         CASE WHEN my_user.latitude IS NOT NULL AND my_user.longitude IS NOT NULL
                   AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
              THEN (6371 * 2 * ASIN(SQRT(
                POWER(SIN((RADIANS(u.latitude) - RADIANS(my_user.latitude)) / 2), 2) +
                COS(RADIANS(my_user.latitude)) * COS(RADIANS(u.latitude)) *
                POWER(SIN((RADIANS(u.longitude) - RADIANS(my_user.longitude)) / 2), 2)
              )))
              ELSE NULL
         END AS distance_km
       FROM users u, my_user
       WHERE u.id != $1
         AND u.gender IS NOT NULL
         -- Email-verification visibility gate: an unverified NEW account can't
         -- view profiles, and unverified NEW accounts aren't shown to anyone
         -- either (activation via the verification link is required for both).
         AND (my_user.email_verified = true OR my_user.created_at < $4::timestamptz)
         AND (u.email_verified = true OR u.created_at < $4::timestamptz)
         AND u.id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = $1
         )
         AND (
           -- They must want my gender (or want everyone)
           (COALESCE(u.seeking_gender, '{man,woman,other}'::text[]) = '{}'::text[] OR my_user.gender = ANY(COALESCE(u.seeking_gender, '{man,woman,other}'::text[])))
           AND
           -- I must want their gender (or want everyone)
           (my_user.seeking_gender = '{}'::text[] OR u.gender = ANY(my_user.seeking_gender))
         )
    )
    SELECT id, name, bio, born_date, interests, location, is_mock,
       gender, seeking_gender, language, created_at, photo_url, age
     FROM ranked
     -- Search-radius filter. No fallback: when the current user has a radius
     -- and coords, ONLY candidates within it appear (empty deck if none).
     -- Legacy accounts (no radius) keep the previous ordering-only behavior.
     WHERE my_radius IS NULL
        OR (distance_km IS NOT NULL AND distance_km <= my_radius)
     ORDER BY distance_km ASC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [sessionUserId, limit, offset, REQUIRES_VERIFICATION_SINCE]
  );
  return result.rows;
}

// Public-safe projection of a user: NO password_hash, email, or phone_number.
// Used for viewing OTHER users' profiles (deck taps, match partner info).
export async function getUserById(id: string) {
  const result = await query(
    `SELECT id, name, bio, born_date, interests, location, is_mock,
       gender, seeking_gender, language,
       COALESCE(photo_url, (SELECT p.url FROM photos p WHERE p.user_id = users.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// Full projection of a user for their OWN session/auth flows: includes email
// and phone_number (the owner is allowed to see them) but NEVER password_hash.
export async function getOwnUserById(id: string) {
  const result = await query(
    `SELECT id, name, email, phone_number, bio, born_date, interests, location, latitude, longitude, search_radius_km,
       is_mock, gender, seeking_gender, language, email_verified, created_at,
       COALESCE(photo_url, (SELECT p.url FROM photos p WHERE p.user_id = users.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// Clear the main profile photo when it points at a URL that's being removed
// from the gallery (DELETE /api/photos/:photoId). Without this, deleting a
// photo from the Photos tab left `users.photo_url` stale, so the swipe deck /
// profile kept showing a photo that no longer existed in the gallery.
export async function clearPhotoUrlIfMatches(userId: string, url: string): Promise<void> {
  await query(
    `UPDATE users SET photo_url = NULL WHERE id = $1 AND photo_url = $2`,
    [userId, url]
  );
}

// Promote a newly-uploaded photo to the main profile photo when the user has
// none (photo_url IS NULL), so there is always a main photo after a user has
// deleted their previous one.
export async function setPhotoUrlIfNull(userId: string, url: string): Promise<void> {
  await query(
    `UPDATE users SET photo_url = $2 WHERE id = $1 AND photo_url IS NULL`,
    [userId, url]
  );
}

export async function updateUserProfile(userId: string, updates: {
  name?: string;
  bio?: string;
  photo_url?: string | null;
  bornDate?: string;
  interests?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  searchRadiusKm?: number;
  gender?: 'man' | 'woman' | 'other';
  seekingGender?: ('man' | 'woman' | 'other')[];
  language?: 'es' | 'en';
}) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx}`);
    values.push(updates.name);
    idx++;
  }
  if (updates.bio !== undefined) {
    fields.push(`bio = $${idx}`);
    values.push(updates.bio);
    idx++;
  }
  if (updates.bornDate !== undefined) {
    fields.push(`born_date = $${idx}`);
    values.push(updates.bornDate);
    idx++;
  }
  if (updates.photo_url !== undefined) {
    fields.push(`photo_url = $${idx}`);
    values.push(updates.photo_url);
    idx++;
  }
  if (updates.interests !== undefined) {
    fields.push(`interests = $${idx}`);
    values.push(updates.interests);
    idx++;
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${idx}`);
    values.push(updates.location);
    idx++;
  }
  if (updates.latitude !== undefined) {
    fields.push(`latitude = $${idx}`);
    values.push(updates.latitude);
    idx++;
  }
  if (updates.longitude !== undefined) {
    fields.push(`longitude = $${idx}`);
    values.push(updates.longitude);
    idx++;
  }
  if (updates.searchRadiusKm !== undefined) {
    fields.push(`search_radius_km = $${idx}`);
    values.push(updates.searchRadiusKm);
    idx++;
  }
  if (updates.gender !== undefined) {
    fields.push(`gender = $${idx}`);
    values.push(updates.gender);
    idx++;
  }
  if (updates.seekingGender !== undefined) {
    fields.push(`seeking_gender = $${idx}`);
    values.push(updates.seekingGender);
    idx++;
  }
  if (updates.language !== undefined) {
    fields.push(`language = $${idx}`);
    values.push(updates.language);
    idx++;
  }

  if (fields.length === 0) return null;

  values.push(userId);
  fields.push(`id = $${idx}`);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, phone_number, bio, born_date, interests, location, latitude, longitude, search_radius_km,
         is_mock, gender, seeking_gender, language,
         COALESCE(photo_url, (SELECT p.url FROM photos p WHERE p.user_id = users.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
         EXTRACT(YEAR FROM AGE(born_date))::integer AS age`,
    values,
  );
  return result.rows[0] || null;
}

// Right to erasure (GDPR art. 17): delete a user and every record tied to them.
// We remove rows explicitly in dependency order rather than relying solely on
// FK cascades, so this works even if a DB predates the cascade migration.
// NOTE: caller is responsible for deleting the user's photo objects from the
// object store (R2/MinIO) before calling this — the photos table row is removed
// here but the file lives outside Postgres.
export async function deleteUserAccount(userId: string): Promise<boolean> {
  // Messages inside matches the user is part of.
  await query(
    `DELETE FROM messages WHERE match_id IN (
       SELECT id FROM matches WHERE user1_id = $1 OR user2_id = $1
     )`,
    [userId],
  );

  // All matches involving the user (both sides).
  await query(`DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1`, [userId]);

  // Swipes the user made or received.
  await query(`DELETE FROM swipes WHERE swiper_id = $1 OR swiped_id = $1`, [userId]);

  // Refresh tokens and photo metadata.
  await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM photos WHERE user_id = $1`, [userId]);

  // Finally the user row itself.
  const result = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [userId]);
  return result.rows.length > 0;
}
