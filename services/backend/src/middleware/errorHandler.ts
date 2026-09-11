import type { Request, Response, NextFunction } from 'express';

/**
 * Global error handler — must be registered LAST with app.use().
 * Converts unhandled errors into the standard { data, error } envelope.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error('[unhandled error]', err);

  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred';

  res.status(500).json({
    data: null,
    error: { code: 'INTERNAL_ERROR', message },
  });
}
