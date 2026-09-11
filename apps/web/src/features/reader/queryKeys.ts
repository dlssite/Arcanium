/**
 * Query key factory for reader data.
 * Constitution §8.1: hardcoded string keys are forbidden.
 */
export const READER_KEYS = {
  all: ['reader'] as const,
  chapter: (slug: string, number: number) => ['reader', 'chapter', slug, number] as const,
} as const;
