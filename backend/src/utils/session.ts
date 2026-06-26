import { Request } from 'express';
import { TEST_USERS } from '../database/migrate';
import { verifyToken } from '../services/authService';

export const USER_SLOTS: Record<string, string> = Object.fromEntries(
  Object.entries(TEST_USERS).map(([slot, u]) => [slot, u.id])
);

export function getUserId(req: Request): string {
  const token = extractBearerToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return decoded.userId;
    }
  }

  const header = req.headers['x-user-id'];
  if (typeof header === 'string' && header) return header;

  return USER_SLOTS.alex;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
