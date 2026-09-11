/**
 * Constitution §8.1: query keys defined as constants, never hardcoded strings.
 */
export const CONTENT_KEYS = {
  /** Root key — invalidates all content queries */
  all: ['content'] as const,

  /** Paginated list with filters */
  list: (params: Record<string, unknown>) => ['content', 'list', params] as const,

  /** Single content by slug */
  detail: (slug: string) => ['content', 'detail', slug] as const,
} as const;
