/**
 * Centralised query key factory for library data.
 * Constitution §8.1: "Query keys are defined as constants. Hardcoded string keys are forbidden."
 */
export const LIBRARY_KEYS = {
  /** ['library'] — root key, invalidates everything library-related */
  all: ['library'] as const,

  /** ['library', 'shelves'] — the full shelf+entry list */
  shelves: ['library', 'shelves'] as const,

  /** ['library', 'progress', contentId] — per-title progress */
  progress: (contentId: string) => ['library', 'progress', contentId] as const,
} as const;
