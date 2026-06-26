import { query } from '../database/connection';

const SESSION_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getOrCreateSessionUser(): Promise<string> {
  return SESSION_USER_ID;
}

export async function getAllUsers(sessionUserId: string) {
  const result = await query(
    `SELECT u.*,
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
    `SELECT *, EXTRACT(YEAR FROM AGE(born_date))::integer AS age FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
