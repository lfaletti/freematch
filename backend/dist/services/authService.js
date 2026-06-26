"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateToken = generateToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshUserToken = refreshUserToken;
exports.loginByPhone = loginByPhone;
exports.registerUserByPhone = registerUserByPhone;
const connection_1 = require("../database/connection");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
function generateToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
function generateRefreshToken(userId, email) {
    return jwt.sign({ userId, email, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (err) {
        return null;
    }
}
async function registerUser(input) {
    const id = (0, uuid_1.v4)();
    const passwordHash = await hashPassword(input.password);
    const result = await (0, connection_1.query)(`INSERT INTO users (
      id, name, email, password_hash, bio, born_date, phone_number, photo_url, is_mock
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
    RETURNING id, name, email, bio, born_date, phone_number, photo_url`, [
        id,
        input.name,
        input.email,
        passwordHash,
        input.bio ?? null,
        input.born_date,
        input.phone_number ?? null,
        input.photo_url ?? null,
    ]);
    const user = result.rows[0];
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    return {
        userId: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        born_date: user.born_date,
        phone_number: user.phone_number,
        photo_url: user.photo_url,
        token,
        refreshToken,
    };
}
async function loginUser(input) {
    const result = await (0, connection_1.query)(`SELECT id, name, email, password_hash, bio, born_date, phone_number, photo_url
     FROM users WHERE email = $1 AND is_mock = false`, [input.email]);
    if (result.rows.length === 0) {
        return null;
    }
    const user = result.rows[0];
    const passwordValid = await comparePassword(input.password, user.password_hash);
    if (!passwordValid) {
        return null;
    }
    await (0, connection_1.query)('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    return {
        userId: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        born_date: user.born_date,
        phone_number: user.phone_number,
        photo_url: user.photo_url,
        token,
        refreshToken,
    };
}
async function refreshUserToken(refreshToken) {
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
        return null;
    }
    const token = generateToken(decoded.userId, decoded.email);
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.email);
    return { token, refreshToken: newRefreshToken };
}
async function loginByPhone(phone_number) {
    const result = await (0, connection_1.query)(`SELECT id, name, bio, born_date, phone_number, email, photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age
     FROM users WHERE phone_number = $1`, [phone_number]);
    return result.rows[0] ?? null;
}
async function registerUserByPhone(input) {
    const id = (0, uuid_1.v4)();
    const result = await (0, connection_1.query)(`INSERT INTO users (id, name, bio, born_date, phone_number, email, photo_url, is_mock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING id, name, bio, born_date, phone_number, email, photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age`, [
        id,
        input.name,
        input.bio ?? null,
        input.born_date,
        input.phone_number,
        input.email ?? null,
        input.photo_url ?? null,
    ]);
    return result.rows[0];
}
