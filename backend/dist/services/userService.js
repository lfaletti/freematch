"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateSessionUser = getOrCreateSessionUser;
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
const connection_1 = require("../database/connection");
const SESSION_USER_ID = '00000000-0000-0000-0000-000000000001';
async function getOrCreateSessionUser() {
    return SESSION_USER_ID;
}
async function getAllUsers(sessionUserId) {
    const result = await (0, connection_1.query)(`SELECT u.*,
       EXTRACT(YEAR FROM AGE(u.born_date))::integer AS age
     FROM users u
     WHERE u.id != $1
       AND u.id NOT IN (
         SELECT swiped_id FROM swipes WHERE swiper_id = $1
       )
     ORDER BY RANDOM()`, [sessionUserId]);
    return result.rows;
}
async function getUserById(id) {
    const result = await (0, connection_1.query)(`SELECT *, EXTRACT(YEAR FROM AGE(born_date))::integer AS age FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
}
