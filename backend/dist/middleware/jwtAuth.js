"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtMiddleware = jwtMiddleware;
exports.extractToken = extractToken;
exports.optionalJwtMiddleware = optionalJwtMiddleware;
const authService_1 = require("../services/authService");
function jwtMiddleware(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    const decoded = (0, authService_1.verifyToken)(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    req.userId = decoded.userId;
    next();
}
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    const queryToken = req.query.token || null;
    if (queryToken) {
        return queryToken;
    }
    return null;
}
function optionalJwtMiddleware(req, res, next) {
    const token = extractToken(req);
    if (token) {
        const decoded = (0, authService_1.verifyToken)(token);
        if (decoded) {
            req.user = decoded;
            req.userId = decoded.userId;
        }
    }
    next();
}
