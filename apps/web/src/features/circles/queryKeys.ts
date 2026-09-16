/**
 * Centralised query key factory for Reading Circles.
 * Constitution §8.1: hardcoded string keys are forbidden.
 */
export const CIRCLES_KEYS = {
  all:   ['circles'] as const,
  lists: () => [...CIRCLES_KEYS.all, 'list'] as const,
  list:  (p?: object) => [...CIRCLES_KEYS.lists(), p ?? {}] as const,

  detail:   (id: string) => [...CIRCLES_KEYS.all, 'detail', id]   as const,
  posts:    (id: string) => [...CIRCLES_KEYS.all, 'posts',  id]   as const,
  replies:  (id: string) => [...CIRCLES_KEYS.all, 'replies', id]  as const,
  members:  (id: string) => [...CIRCLES_KEYS.all, 'members', id]  as const,
  requests: (id: string) => [...CIRCLES_KEYS.all, 'requests', id] as const,
  sessions: (id: string) => [...CIRCLES_KEYS.all, 'sessions', id] as const,
} as const;
