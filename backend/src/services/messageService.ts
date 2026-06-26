import { query } from '../database/connection';

export async function getMessages(matchId: string) {
  const result = await query(
    'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC',
    [matchId]
  );
  return result.rows;
}

export async function saveMessage(matchId: string, senderId: string, content: string) {
  const result = await query(
    `INSERT INTO messages (match_id, sender_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [matchId, senderId, content]
  );
  return result.rows[0];
}
