import { Request, Response } from 'express';
import { TEST_USERS } from '../database/migrate';
import { verifyToken } from '../services/authService';

export const USER_SLOTS: Record<string, string> = Object.fromEntries(
  Object.entries(TEST_USERS).map(([slot, u]) => [slot, u.id])
);

// Dev-only backdoors (X-User-Id impersonation + `alex` fallback) are enabled
// ONLY in an explicit `development` environment. `staging` and `production`
// (or any other NODE_ENV) require a valid JWT — no token means 401.
const isDev = process.env.NODE_ENV === 'development';

/** Thrown when a request has no valid JWT. Routes map this to a 401. */
export class AuthError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthError';
  }
}

export function isAuthError(err: unknown): err is AuthError {
  return err instanceof AuthError;
}

/** Writes a 401 and returns true when `err` is an AuthError (auth failure). */
export function respondAuthError(res: Response, err: unknown): boolean {
  if (err instanceof AuthError) {
    res.status(401).json({ error: err.message });
    return true;
  }
  return false;
}

export function getUserId(req: Request): string {
  const token = extractBearerToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return decoded.userId;
    }
  }

  if (isDev) {
    // Legacy dev-only: allow X-User-Id header to impersonate during local testing
    const header = req.headers['x-user-id'];
    if (typeof header === 'string' && header) return header;

    // Last-resort dev convenience: use a known dev user so local startup doesn't crash
    return USER_SLOTS.alex;
  }

  throw new AuthError('Authentication required: no valid token provided');
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
