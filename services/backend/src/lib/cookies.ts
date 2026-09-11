import type { Response } from 'express';
import { env } from './env.js';

export const REFRESH_COOKIE = 'arcanium_refresh';

/** Write the httpOnly refresh token cookie. */
export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/v1/auth',              // scoped — only sent to auth routes
  });
}

/** Clear the refresh token cookie. */
export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}
