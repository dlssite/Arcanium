/**
 * Stable TanStack Query key constants for the creator feature.
 * Constitution §8.1: Query keys are defined as constants in the relevant
 * features/<name>/queryKeys.ts file. Hardcoded string keys are forbidden.
 */

export const CREATOR_QUERY_KEYS = {
  /** The user's own creator application status — re-uses the users/me key family. */
  applicationStatus: ['creator', 'application', 'status'] as const,
} as const;
