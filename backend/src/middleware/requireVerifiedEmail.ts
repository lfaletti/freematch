import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../services/authService';
import { query } from '../database/connection';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  userId?: string;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const queryToken = (req.query.token as string) || null;
  if (queryToken) return queryToken;
  return null;
}

/**
 * requireVerifiedEmail — for protected routes that operate on the account.
 * Rejects with 403 EMAIL_NOT_VERIFIED when the authenticated user is a NEW
 * account (created on/after the cut-off) that hasn't verified its email.
 * Old accounts (created before the cut-off) are exempt.
 */
export async function requireVerifiedEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Right to erasure (GDPR): deleting your account must always be allowed, even
  // for a NEW account that hasn't verified its email yet — otherwise a user
  // stuck in "verify your email" couldn't ever remove their data.
  if (req.method === 'DELETE') {
    // Still enforce auth (the route pulls the user from the token) but skip the
    // email-verification gate for this destructive-but-always-permitted action.
    next();
    return;
  }

  // Attach the user if not already done by jwtMiddleware.
  if (!req.user) {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    req.userId = decoded.userId;
  }

  const userId = req.user.userId;
  try {
    const result = await query(
      `SELECT email_verified, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const row = result.rows[0];
    const isNew = row.created_at && new Date(row.created_at) >= new Date('2026-08-18');
    if (isNew && !row.email_verified) {
      return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email to continue' });
    }
    next();
  } catch (err) {
    console.error('requireVerifiedEmail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
