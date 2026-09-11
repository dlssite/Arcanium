import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

// Extend Express Request to carry the authenticated user id and role
declare global {
  namespace Express {
    interface Request {
      user: { id: string; role: string };
    }
  }
}

/**
 * JWT authentication middleware.
 * Reads Bearer token from the Authorization header.
 * Attaches req.user = { id, role } on success.
 * Returns 401 on failure — never throws.
 *
 * role defaults to 'USER' — requireRole middleware enforces elevated access.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' },
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access' || !payload.sub) {
      throw new Error('Invalid token type');
    }
    // role is embedded in the JWT; default to USER if absent (backward compat)
    req.user = { id: payload.sub, role: (payload as { role?: string }).role ?? 'USER' };
    next();
  } catch {
    res.status(401).json({
      data: null,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
    });
  }
}
