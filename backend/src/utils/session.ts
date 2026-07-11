import { Request } from 'express';
import { TEST_USERS } from '../database/migrate';
import { verifyToken } from '../services/authService';

export const USER_SLOTS: Record<string, string> = Object.fromEntries(
  Object.entries(TEST_USERS).map(([slot, u]) => [slot, u.id])
);

const isDev = process.env.NODE_ENV !== 'production';

export function getUserId(req: Request): string {
  const token = extractBearerToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return decoded.userId;
    }
  }

  // Legacy dev-only: allow X-User-Id header to impersonate during local testing
  if (isDev) {
    const header = req.headers['x-user-id'];
    if (typeof header === 'string' && header) return header;
  }

  // Production: require a valid JWT; dev fallback kept only for Docker/Expo dev
  if (isDev) {
    // Last-resort dev convenience: use a known dev user so local startup doesn't crash
    return USER_SLOTS.alex;
  }

  throw new Error('Authentication required: no valid token provided');
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
