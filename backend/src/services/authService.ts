import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET_EFFECTIVE = JWT_SECRET || 'dev-secret-do-not-use-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  bio?: string;
  born_date: string;
  phone_number?: string;
  photo_url?: string;
  id?: string; // Pre-generated UUID for S3 upload; falls back to internal generation.
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  born_date: string;
  phone_number?: string;
  photo_url?: string;
  token: string;
  refreshToken: string;
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as JWTPayload,
    JWT_SECRET_EFFECTIVE,
    { expiresIn: JWT_EXPIRY }
  );
}

export function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'refresh' } as JWTPayload & { type: string },
    JWT_SECRET_EFFECTIVE,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_EFFECTIVE) as JWTPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const id = input.id || uuidv4();
  const passwordHash = await hashPassword(input.password);

  const result = await query(
    `INSERT INTO users (
      id, name, email, password_hash, bio, born_date, phone_number, photo_url, is_mock
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
    RETURNING id, name, email, bio, born_date, phone_number, photo_url`,
    [
      id,
      input.name,
      input.email,
      passwordHash,
      input.bio ?? null,
      input.born_date,
      input.phone_number ?? null,
      input.photo_url ?? null,
    ]
  );

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

export async function loginUser(input: LoginInput): Promise<AuthResponse | null> {
  const result = await query(
    `SELECT id, name, email, password_hash, bio, born_date, phone_number, photo_url
     FROM users WHERE email = $1 AND is_mock = false`,
    [input.email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const passwordValid = await comparePassword(input.password, user.password_hash);

  if (!passwordValid) {
    return null;
  }

  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

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

export async function refreshUserToken(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
  const decoded = verifyToken(refreshToken);
  if (!decoded) {
    return null;
  }

  const token = generateToken(decoded.userId, decoded.email);
  const newRefreshToken = generateRefreshToken(decoded.userId, decoded.email);

  return { token, refreshToken: newRefreshToken };
}

export async function loginByPhone(phone_number: string) {
  const result = await query(
    `SELECT id, name, bio, born_date, phone_number, email, photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age
     FROM users WHERE phone_number = $1`,
    [phone_number]
  );
  return result.rows[0] ?? null;
}

export async function registerUserByPhone(input: any) {
  const id = input.id || uuidv4();
  const result = await query(
    `INSERT INTO users (id, name, bio, born_date, phone_number, email, photo_url, is_mock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING id, name, bio, born_date, phone_number, email, photo_url,
       EXTRACT(YEAR FROM AGE(born_date))::integer AS age`,
    [
      id,
      input.name,
      input.bio ?? null,
      input.born_date,
      input.phone_number,
      input.email ?? null,
      input.photo_url ?? null,
    ]
  );
  return result.rows[0];
}
