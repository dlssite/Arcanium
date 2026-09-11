import { z } from 'zod';
import { ContentTypeSchema, ContentStatusSchema } from './book.js';

// ---------------------------------------------------------------------------
// Creator content creation / update DTOs
// ---------------------------------------------------------------------------

export const CreateContentSchema = z.object({
  title: z.string().min(1).max(300),
  type: ContentTypeSchema,
  synopsis: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  language: z.string().default('en'),
  genres: z.array(z.string()).max(5).optional(),
});

export type CreateContentInput = z.infer<typeof CreateContentSchema>;

export const UpdateContentSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  synopsis: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  status: ContentStatusSchema.optional(),
  genres: z.array(z.string()).max(5).optional(),
});

export type UpdateContentInput = z.infer<typeof UpdateContentSchema>;

// ---------------------------------------------------------------------------
// Chapter creation / update DTOs
// ---------------------------------------------------------------------------

export const CreateChapterSchema = z.object({
  number: z.number().min(0),
  title: z.string().max(300).optional(),
  bodyText: z.string().min(1),
  isDraft: z.boolean().default(true),
});

export type CreateChapterInput = z.infer<typeof CreateChapterSchema>;

export const UpdateChapterSchema = z.object({
  title: z.string().max(300).optional(),
  bodyText: z.string().min(1).optional(),
  number: z.number().min(0).optional(),
});

export type UpdateChapterInput = z.infer<typeof UpdateChapterSchema>;

// ---------------------------------------------------------------------------
// Ingest (scraper) request DTO — used by admin Pipeline A
// ---------------------------------------------------------------------------

export const IngestContentSchema = z.object({
  url: z.string().url(),
  type: ContentTypeSchema,
  overrideTitle: z.string().max(300).optional(),
});

export type IngestContentInput = z.infer<typeof IngestContentSchema>;

// ---------------------------------------------------------------------------
// Creator chapter summary (list view, no bodyText)
// ---------------------------------------------------------------------------

export const CreatorChapterSummarySchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string().nullable(),
  wordCount: z.number().int(),
  isPublished: z.boolean(),
  isDraft: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type CreatorChapterSummary = z.infer<typeof CreatorChapterSummarySchema>;

// ---------------------------------------------------------------------------
// Creator onboarding application DTO — submitted by users from the web app
// ---------------------------------------------------------------------------

export const CreatorApplicationSchema = z.object({
  applicantName:  z.string().min(2).max(100),
  penName:        z.string().min(1).max(100),
  portfolioUrl:   z.string().url().optional().or(z.literal('')),
  sampleTitle:    z.string().min(1).max(300),
  sampleSynopsis: z.string().min(50).max(2000),
  pitch:          z.string().min(100).max(3000),
  primaryGenre:   z.string().min(1).max(100),
});

export type CreatorApplicationInput = z.infer<typeof CreatorApplicationSchema>;
