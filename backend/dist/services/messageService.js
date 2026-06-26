"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = getMessages;
exports.saveMessage = saveMessage;
const connection_1 = require("../database/connection");
async function getMessages(matchId) {
    const result = await (0, connection_1.query)('SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC', [matchId]);
    return result.rows;
}
async function saveMessage(matchId, senderId, content) {
    const result = await (0, connection_1.query)(`INSERT INTO messages (match_id, sender_id, content)
     VALUES ($1, $2, $3) RETURNING *`, [matchId, senderId, content]);
    return result.rows[0];
}
