import { z } from 'zod';
import { ContentSchema, ContentTypeSchema, ContentStatusSchema } from './book.js';

// ---------------------------------------------------------------------------
// Query params for GET /api/v1/content
// ---------------------------------------------------------------------------

export const ContentQuerySchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  type: ContentTypeSchema.optional(),
  status: ContentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ContentQuery = z.infer<typeof ContentQuerySchema>;

// ---------------------------------------------------------------------------
// Paginated list response
// ---------------------------------------------------------------------------

export const ContentListResponseSchema = z.object({
  items: z.array(ContentSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  hasMore: z.boolean(),
});

export type ContentListResponse = z.infer<typeof ContentListResponseSchema>;

// ---------------------------------------------------------------------------
// Single content response (GET /api/v1/content/:slug)
// Extends Content with its chapters summary
// ---------------------------------------------------------------------------

export const ContentDetailSchema = ContentSchema.extend({
  chapters: z.array(
    z.object({
      id: z.string().cuid(),
      number: z.number(),
      title: z.string().nullable(),
      publishedAt: z.string().datetime().nullable(),
    }),
  ),
});

export type ContentDetail = z.infer<typeof ContentDetailSchema>;
