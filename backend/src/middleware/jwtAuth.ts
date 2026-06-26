import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  userId?: string;
}

export function jwtMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
  next();
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const queryToken = (req.query.token as string) || null;
  if (queryToken) {
    return queryToken;
  }

  return null;
}

export function optionalJwtMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.userId = decoded.userId;
    }
  }

  next();
}
