import { query } from '../database/connection';

const SESSION_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getOrCreateSessionUser(): Promise<string> {
  return SESSION_USER_ID;
}

export async function getAllUsers(sessionUserId: string) {
  const result = await query(
    `SELECT u.*,
       COALESCE(u.photo_url, (SELECT p.url FROM photos p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1)) AS photo_url,
       EXTRACT(YEAR FROM AGE(u.born_date))::integer AS age
     FROM users u
     WHERE u.id != $1
       AND u.id NOT IN (
         SELECT swiped_id FROM swipes WHERE swiper_id = $1
       )
     ORDER BY RANDOM()`,
    [sessionUserId]
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
