import jwt from 'jsonwebtoken';
import { env } from './env.js';

export interface TokenPayload {
  sub: string;           // User.id
  type: 'access' | 'refresh';
  role?: string;         // UserRole — embedded so requireRole doesn't need a DB lookup
}

export function signAccessToken(userId: string, role = 'USER'): string {
  return jwt.sign(
    { sub: userId, type: 'access', role } satisfies TokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' } satisfies TokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
