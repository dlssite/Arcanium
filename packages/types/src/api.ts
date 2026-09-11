/**
 * Universal API response envelope.
 * Every endpoint returns exactly one of these two shapes.
 * Constitution §5.2: "API responses follow a consistent envelope."
 */
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

/**
 * Helper — narrow an ApiResponse to its success branch.
 */
export function isApiSuccess<T>(
  res: ApiResponse<T>,
): res is { data: T; error: null } {
  return res.error === null;
}
