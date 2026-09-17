import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

/**
 * Optional JWT authentication middleware.
 * If a valid Bearer token is present, attaches req.user = { id, role }.
 * If the token is missing or invalid, continues WITHOUT setting req.user.
 * Never returns 401 — always calls next().
 *
 * Use on public endpoints that provide richer responses to authenticated users
 * (e.g. personalised recommendations).
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload.type === 'access' && payload.sub) {
        req.user = { id: payload.sub, role: (payload as { role?: string }).role ?? 'USER' };
      }
    } catch {
      // Invalid/expired token — treat as anonymous, don't block the request
    }
  }

  next();
}
