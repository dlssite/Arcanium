import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory — blocks a route with 403 when the feature flag is disabled.
 * Usage: router.post('/chat', authenticate, featureFlag('AI_HOUSEKEEPER'), handler)
 */
export function featureFlag(flag: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (process.env[`FEATURE_FLAG_${flag}`] !== 'true') {
      res.status(403).json({
        data: null,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'This feature is not currently enabled.',
        },
      });
      return;
    }
    next();
  };
}
