import { query } from '../database/connection';

const SESSION_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getOrCreateSessionUser(): Promise<string> {
  return SESSION_USER_ID;
}

export async function getAllUsers(sessionUserId: string, limit: number, offset: number) {
  const result = await query(
    `WITH my_user AS (
      SELECT 
        COALESCE(gender, 'other') as gender, 
        COALESCE(seeking_gender, '{man,woman,other}'::text[]) as seeking_gender 
      FROM users WHERE id = $1
    )
    SELECT u.*,
       COALESCE(u.photo_url, (SELECT p.url FROM photos p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
       EXTRACT(YEAR FROM AGE(u.born_date))::integer AS age
     FROM users u, my_user
     WHERE u.id != $1
       AND u.gender IS NOT NULL
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
     ORDER BY RANDOM()
     LIMIT $2 OFFSET $3`,
    [sessionUserId, limit, offset]
  );
  return result.rows;
}

export async function getUserById(id: string) {
  const result = await query(
    `SELECT *,
       COALESCE(photo_url, (SELECT p.url FROM photos p WHERE p.user_id = users.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateUserProfile(userId: string, updates: {
  name?: string;
  bio?: string;
  photo_url?: string | null;
  interests?: string[];
  location?: string;
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
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *,
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
