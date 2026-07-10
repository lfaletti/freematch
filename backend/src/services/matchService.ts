import { query } from '../database/connection';

export async function createMatch(user1Id: string, user2Id: string) {
  const [a, b] = [user1Id, user2Id].sort();
  const result = await query(
    `INSERT INTO matches (user1_id, user2_id)
     VALUES ($1, $2)
     ON CONFLICT (user1_id, user2_id) DO NOTHING
     RETURNING *`,
    [a, b]
  );
  return result.rows[0] || null;
}

export async function getMatchesForUser(userId: string) {
  const result = await query(
    `SELECT m.*,
      u.id as partner_id, u.name as partner_name,
      EXTRACT(YEAR FROM AGE(u.born_date))::integer as partner_age,
      COALESCE(u.photo_url, (SELECT p.url FROM photos p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1)) as partner_photo,
      u.bio as partner_bio, u.location as partner_location,
      u.interests as partner_interests,
      (SELECT content FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message_at
     FROM matches m
     JOIN users u ON (
       CASE WHEN m.user1_id = $1::uuid THEN m.user2_id ELSE m.user1_id END = u.id
     )
     WHERE m.user1_id = $1::uuid OR m.user2_id = $1::uuid
     ORDER BY m.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getMatchById(matchId: string) {
  const result = await query('SELECT * FROM matches WHERE id = $1', [matchId]);
  return result.rows[0] || null;
}

// Removes a match (and, via ON DELETE CASCADE on messages.match_id, the whole
// conversation). Only a participant can unmatch; returns the deleted row — which
// carries both user ids — so the caller can notify the other user, or null when
// the match doesn't exist or the user isn't part of it.
export async function deleteMatch(matchId: string, userId: string) {
  const result = await query(
    `DELETE FROM matches
     WHERE id = $1::uuid AND (user1_id = $2::uuid OR user2_id = $2::uuid)
     RETURNING *`,
    [matchId, userId]
  );
  return result.rows[0] || null;
}

// A single match enriched with the partner's details from `userId`'s perspective
// (same shape as getMatchesForUser rows). Used to push a `new_match` event.
export async function getMatchForUser(matchId: string, userId: string) {
  const result = await query(
    `SELECT m.*,
      u.id as partner_id, u.name as partner_name,
      EXTRACT(YEAR FROM AGE(u.born_date))::integer as partner_age,
      COALESCE(u.photo_url, (SELECT p.url FROM photos p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1)) as partner_photo,
      u.bio as partner_bio, u.location as partner_location,
      u.interests as partner_interests,
      (SELECT content FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message_at
     FROM matches m
     JOIN users u ON (
       CASE WHEN m.user1_id = $1::uuid THEN m.user2_id ELSE m.user1_id END = u.id
     )
     WHERE m.id = $2::uuid AND (m.user1_id = $1::uuid OR m.user2_id = $1::uuid)`,
    [userId, matchId]
  );
  return result.rows[0] || null;
}
