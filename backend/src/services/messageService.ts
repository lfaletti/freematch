import { query } from '../database/connection';

// Basic content sanitization to prevent stored XSS when messages
// are rendered on the web frontend.
function sanitizeContent(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function getMessages(matchId: string) {
  const result = await query(
    'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC',
    [matchId]
  );
  return result.rows;
}

export async function saveMessage(matchId: string, senderId: string, content: string) {
  const sanitized = sanitizeContent(content);
  const result = await query(
    `INSERT INTO messages (match_id, sender_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [matchId, senderId, sanitized]
  );
  return result.rows[0];
}
