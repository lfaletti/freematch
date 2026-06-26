"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMatch = createMatch;
exports.getMatchesForUser = getMatchesForUser;
exports.getMatchById = getMatchById;
const connection_1 = require("../database/connection");
async function createMatch(user1Id, user2Id) {
    const [a, b] = [user1Id, user2Id].sort();
    const result = await (0, connection_1.query)(`INSERT INTO matches (user1_id, user2_id)
     VALUES ($1, $2)
     ON CONFLICT (user1_id, user2_id) DO NOTHING
     RETURNING *`, [a, b]);
    return result.rows[0] || null;
}
async function getMatchesForUser(userId) {
    const result = await (0, connection_1.query)(`SELECT m.*, 
      u.id as partner_id, u.name as partner_name,
      EXTRACT(YEAR FROM AGE(u.born_date))::integer as partner_age,
      u.photo_url as partner_photo, u.bio as partner_bio, u.location as partner_location,
      u.interests as partner_interests,
      (SELECT content FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message_at
     FROM matches m
     JOIN users u ON (
       CASE WHEN m.user1_id = $1::uuid THEN m.user2_id ELSE m.user1_id END = u.id
     )
     WHERE m.user1_id = $1::uuid OR m.user2_id = $1::uuid
     ORDER BY m.created_at DESC`, [userId]);
    return result.rows;
}
async function getMatchById(matchId) {
    const result = await (0, connection_1.query)('SELECT * FROM matches WHERE id = $1', [matchId]);
    return result.rows[0] || null;
}
