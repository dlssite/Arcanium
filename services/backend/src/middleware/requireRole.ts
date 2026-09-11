import type { Request, Response, NextFunction } from 'express';

type UserRole = 'USER' | 'VERIFIED_WRITER' | 'MODERATOR' | 'ADMIN';

/**
 * Role-based access control middleware.
 * Must be used after authenticate().
 *
 * Usage:
 *   router.post('/ingest', authenticate, requireRole('ADMIN', 'MODERATOR'), handler)
 *
 * Constitution §5: all authorization enforced server-side, never trust the client.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.user?.role ?? 'USER') as UserRole;
    if (!roles.includes(userRole)) {
      res.status(403).json({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of: ${roles.join(', ')}`,
        },
      });
      return;
    }
    next();
  };
}
