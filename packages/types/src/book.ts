import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums — mirror Prisma enums in database-schema.md
// ---------------------------------------------------------------------------

export const ContentTypeSchema = z.enum([
  'WEB_NOVEL',
  'LIGHT_NOVEL',
  'COMIC',
  'MANGA',
  'EBOOK',
  'WEBTOON',
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentStatusSchema = z.enum([
  'ONGOING',
  'COMPLETED',
  'HIATUS',
  'CANCELLED',
  'UNKNOWN',
]);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

export const ContentSourceSchema = z.enum([
  'SCRAPED',
  'CREATOR_UPLOAD',
  'ADMIN_UPLOAD',
]);
export type ContentSource = z.infer<typeof ContentSourceSchema>;

// NOTE: UserRoleSchema and UserRole previously lived here but have been
// consolidated in user.ts. They are exported from the package index via user.ts.

export const ReadingStatusSchema = z.enum([
  'READING',
  'COMPLETED',
  'ON_HOLD',
  'DROPPED',
  'PLAN_TO_READ',
]);
export type ReadingStatus = z.infer<typeof ReadingStatusSchema>;

// ---------------------------------------------------------------------------
// Content — mirrors the Prisma Content model (catalogue entry, not user-owned)
// ---------------------------------------------------------------------------

export const ContentSchema = z.object({
  id: z.string().cuid(),
  type: ContentTypeSchema,
  status: ContentStatusSchema,
  source: ContentSourceSchema.default('SCRAPED'),
  title: z.string(),
  slug: z.string(),
  author: z.string().nullable(),
  artist: z.string().nullable(),
  synopsis: z.string().nullable(),
  coverImageUrl: z.string().url().nullable(),
  language: z.string().default('en'),
  sourceUrl: z.string().nullable(),
  sourceSite: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  chapterCount: z.number().int().default(0),
  rating: z.number().nullable(),
  creatorId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Content = z.infer<typeof ContentSchema>;

// ---------------------------------------------------------------------------
// ChapterDetail — returned by GET /api/v1/content/:slug/chapters/:number
// ---------------------------------------------------------------------------

/**
 * contentMode — explicit rendering signal set by the backend from content.type.
 *
 * 'image' → MANGA / COMIC / WEBTOON: bodyText is a JSON string[] of CDN image URLs.
 *            Render as a vertical image scroll stack.
 * 'text'  → WEB_NOVEL / LIGHT_NOVEL / EBOOK: bodyText is sanitised HTML prose.
 *            Render with reader typography.
 *
 * Replaces the fragile `bodyText.trimStart().startsWith('[')` heuristic (L2 fix).
 */
export const ContentModeSchema = z.enum(['image', 'text']);
export type ContentMode = z.infer<typeof ContentModeSchema>;

export const ChapterDetailSchema = z.object({
  id: z.string().cuid(),
  number: z.number(),
  title: z.string().nullable(),
  bodyText: z.string().nullable(),
  wordCount: z.number().int(),
  isPublished: z.boolean(),
  sourceUrl: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  // L2 fix — backend-derived rendering mode; never infer from bodyText shape
  contentMode: ContentModeSchema,
  // Sibling navigation
  prevChapter: z.number().nullable(),
  nextChapter: z.number().nullable(),
  // Parent content summary
  content: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    type: ContentTypeSchema,
    chapterCount: z.number().int(),
    source: ContentSourceSchema,
  }),
});

export type ChapterDetail = z.infer<typeof ChapterDetailSchema>;

// ---------------------------------------------------------------------------
// ReadingProgress — mirrors the Prisma ReadingProgress model
// ---------------------------------------------------------------------------

export const ReadingProgressSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  contentId: z.string().cuid(),
  status: ReadingStatusSchema,
  lastChapterRead: z.number().nullable(),
  scrollPosition: z.number().min(0).max(1).nullable(),
  lastReadAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type ReadingProgress = z.infer<typeof ReadingProgressSchema>;

// ---------------------------------------------------------------------------
// Upsert progress DTO
// ---------------------------------------------------------------------------

export const UpsertProgressSchema = z.object({
  status: ReadingStatusSchema,
  lastChapterRead: z.number().optional(),
  scrollPosition: z.number().min(0).max(1).optional(),
});

export type UpsertProgressInput = z.infer<typeof UpsertProgressSchema>;
