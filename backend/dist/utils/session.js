"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_SLOTS = void 0;
exports.getUserId = getUserId;
exports.extractBearerToken = extractBearerToken;
const migrate_1 = require("../database/migrate");
const authService_1 = require("../services/authService");
exports.USER_SLOTS = Object.fromEntries(Object.entries(migrate_1.TEST_USERS).map(([slot, u]) => [slot, u.id]));
function getUserId(req) {
    const token = extractBearerToken(req);
    if (token) {
        const decoded = (0, authService_1.verifyToken)(token);
        if (decoded) {
            return decoded.userId;
        }
    }
    const header = req.headers['x-user-id'];
    if (typeof header === 'string' && header)
        return header;
    return exports.USER_SLOTS.alex;
}
function extractBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}
