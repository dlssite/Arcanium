import { z } from 'zod';
import { ContentSchema, ReadingStatusSchema, UpsertProgressSchema } from './book.js';

// ---------------------------------------------------------------------------
// Shelf entry — one content item inside a shelf, joined with progress
// ---------------------------------------------------------------------------

export const LibraryEntrySchema = z.object({
  // ShelfEntry fields
  shelfEntryId: z.string().cuid(),
  addedAt: z.string().datetime(),
  note: z.string().nullable(),
  sortOrder: z.number().int(),

  // Content catalogue fields
  content: ContentSchema.pick({
    id: true,
    title: true,
    slug: true,
    author: true,
    synopsis: true,
    coverImageUrl: true,
    chapterCount: true,
    rating: true,
    type: true,
    status: true,
    metadata: true,
  }),

  // Per-user reading progress (null if never started)
  progress: z
    .object({
      status: ReadingStatusSchema,
      lastChapterRead: z.number().nullable(),
      scrollPosition: z.number().nullable(),
      lastReadAt: z.string().datetime().nullable(),
      startedAt: z.string().datetime().nullable(),
      completedAt: z.string().datetime().nullable(),
    })
    .nullable(),
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

// ---------------------------------------------------------------------------
// Shelf — with its entries
// ---------------------------------------------------------------------------

export const ShelfWithEntriesSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  entries: z.array(LibraryEntrySchema),
});

export type ShelfWithEntries = z.infer<typeof ShelfWithEntriesSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/library response
// ---------------------------------------------------------------------------

export const LibraryResponseSchema = z.object({
  shelves: z.array(ShelfWithEntriesSchema),
});

export type LibraryResponse = z.infer<typeof LibraryResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/v1/library/shelves/:shelfId/entries — request body
// ---------------------------------------------------------------------------

export const AddToShelfSchema = z.object({
  contentId: z.string().cuid(),
});

export type AddToShelfInput = z.infer<typeof AddToShelfSchema>;

// Re-export UpsertProgressInput so consumers only need to import from @arcanium/types
export { UpsertProgressSchema };
export type { UpsertProgressInput } from './book.js';
