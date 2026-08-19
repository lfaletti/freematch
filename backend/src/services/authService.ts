import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET_EFFECTIVE = JWT_SECRET || 'dev-secret-do-not-use-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Email verification cut-off. Accounts created ON/AFTER this date must verify
// their email before using the app (strong 2FA-style signup). Accounts created
// before it keep working as-is (email verification was optional back then).
const REQUIRES_VERIFICATION_SINCE = '2026-08-18';

/** Whether an account must verify its email to operate (new + not verified). */
export function requiresEmailVerification(
  createdAt: string | Date | null | undefined,
  emailVerified: boolean | undefined | null
): boolean {
  if (emailVerified) return false;
  return !!createdAt && new Date(createdAt) >= new Date(REQUIRES_VERIFICATION_SINCE);
}

export type GenderValue = 'man' | 'woman' | 'other';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  bio?: string;
  born_date: string;
  phone_number?: string;
  photo_url?: string;
  id?: string; // Pre-generated UUID for S3 upload; falls back to internal generation.
  gender?: GenderValue;
  seekingGender?: GenderValue[];
  language?: 'es' | 'en';
  privacyAcceptedAt?: string; // ISO timestamp of when the user accepted the Privacy Policy
  termsAcceptedAt?: string;   // ISO timestamp of when the user accepted the Terms of Service
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
  emailVerified?: boolean;
  requiresVerification?: boolean;
  gender?: string;
  seekingGender?: string[];
  language?: 'es' | 'en';
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
      id, name, email, password_hash, bio, born_date, phone_number, photo_url, is_mock,
      gender, seeking_gender, language, privacy_policy_accepted_at, terms_accepted_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, $12, $13)
    RETURNING id, name, email, bio, born_date, phone_number, photo_url, gender, seeking_gender, language`,
    [
      id,
      input.name,
      input.email,
      passwordHash,
      input.bio ?? null,
      input.born_date,
      input.phone_number ?? null,
      input.photo_url ?? null,
      input.gender ?? null,
      input.seekingGender ?? [],
      input.language ?? 'es',
      input.privacyAcceptedAt ?? null,
      input.termsAcceptedAt ?? null,
    ]
  );

  const user = result.rows[0];
  const token = generateToken(user.id, user.email);
  const refreshToken = await generateAndStoreRefreshToken(user.id, user.email);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    born_date: user.born_date,
    phone_number: user.phone_number,
    photo_url: user.photo_url,
    emailVerified: user.email_verified ?? false,
    // A freshly created account always needs email verification (strong
    // signup): mirror what loginUser computes via requiresEmailVerification.
    requiresVerification: true,
    gender: user.gender,
    seekingGender: user.seeking_gender,
    language: user.language ?? 'es',
    token,
    refreshToken,
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResponse & { requiresVerification?: boolean } | null> {
  const result = await query(
    `SELECT id, name, email, password_hash, bio, born_date, phone_number, photo_url, email_verified, created_at, gender, seeking_gender, language
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

  const requiresVerification = requiresEmailVerification(user.created_at, user.email_verified);

  const token = generateToken(user.id, user.email);
  const refreshToken = await generateAndStoreRefreshToken(user.id, user.email);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    born_date: user.born_date,
    phone_number: user.phone_number,
    photo_url: user.photo_url,
    emailVerified: user.email_verified ?? false,
    requiresVerification,
    gender: user.gender,
    seekingGender: user.seeking_gender,
    language: user.language ?? 'es',
    token,
    refreshToken,
  };
}

export async function refreshUserToken(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
  const decoded = verifyToken(refreshToken);
  if (!decoded) {
    return null;
  }

  // Check if the token hash exists in DB and is not revoked
  const tokenHash = sha256(refreshToken);
  const stored = await query(
    `SELECT id, revoked_at, replaced_by, expires_at FROM refresh_tokens
     WHERE token_hash = $1 AND user_id = $2`,
    [tokenHash, decoded.userId]
  );

  if (stored.rows.length === 0) {
    // Token not found or never issued — possible theft, revoke family
    await revokeUserTokens(decoded.userId);
    return null;
  }

  const row = stored.rows[0];
  if (row.revoked_at) {
    // Already revoked — token reuse detected, revoke remaining tokens
    await revokeUserTokens(decoded.userId);
    return null;
  }

  // Rotation: revoke the old token, issue a new one
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
    [row.id]
  );

  const token = generateToken(decoded.userId, decoded.email);
  const newRefreshToken = await generateAndStoreRefreshToken(
    decoded.userId,
    decoded.email,
    row.id
  );

  return { token, refreshToken: newRefreshToken };
}

function sha256(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function generateAndStoreRefreshToken(
  userId: string,
  email: string,
  replacedById?: string
): Promise<string> {
  const token = generateRefreshToken(userId, email);
  const tokenHash = sha256(token);

  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, replaced_by)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, replacedById ?? null]
  );

  return token;
}

async function revokeUserTokens(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

export async function verifyEmailToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_EFFECTIVE) as JWTPayload & { type: string };
    if (decoded.type !== 'email_verify') return null;

    const res = await query(
      `UPDATE users SET email_verified = true, email_verified_at = NOW()
       WHERE id = $1 AND email_verified = false RETURNING id, email`,
      [decoded.userId]
    );

    if (res.rows.length === 0) return null; // already verified / not found
    return { userId: res.rows[0].id, email: res.rows[0].email };
  } catch {
    return null;
  }
}

export async function generateEmailVerificationToken(userId: string, email: string): Promise<string> {
  return jwt.sign(
    { userId, email, type: 'email_verify' } as JWTPayload & { type: string },
    JWT_SECRET_EFFECTIVE,
    { expiresIn: '24h' }
  );
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

// ── Password reset ──────────────────────────────────────────────────

export async function generatePasswordResetToken(email: string): Promise<{ token: string; userId: string } | null> {
  const result = await query(
    `SELECT id, email FROM users WHERE email = $1 AND is_mock = false`,
    [email]
  );
  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const token = jwt.sign(
    { userId: user.id, email: user.email, type: 'password_reset' } as JWTPayload & { type: string },
    JWT_SECRET_EFFECTIVE,
    { expiresIn: '15m' }
  );
  return { token, userId: user.id };
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_EFFECTIVE) as JWTPayload & { type: string };
    if (decoded.type !== 'password_reset') return false;

    const passwordHash = await hashPassword(newPassword);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, decoded.userId]);

    // Revoke all refresh tokens so the user must log in again
    await revokeUserTokens(decoded.userId);

    return true;
  } catch {
    return false;
  }
}
