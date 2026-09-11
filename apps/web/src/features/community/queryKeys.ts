/**
 * Centralised query key factory for community data.
 * Constitution §8.1: hardcoded string keys are forbidden.
 */
export const COMMUNITY_KEYS = {
  /** ['community'] — root key, invalidates everything community-related */
  all: ['community'] as const,
  /** ['community', 'overview'] — circles + posts + challenge */
  overview: ['community', 'overview'] as const,
} as const;
