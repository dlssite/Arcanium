import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const getChapterPassageArgsSchema = z.object({
  slug: z.string().min(1).max(200).optional(),
  contentId: z.string().cuid().optional(),
  /**
   * Chapter number to fetch. Defaults to 1 if not specified.
   * Accepts floats for sub-chapters (e.g. 1.5 for a prologue).
   */
  chapterNumber: z.number().min(0).default(1),
  /**
   * Maximum characters to return. Keeps the context window manageable.
   * Frontend TTS will speak this text directly, so keep it readable length.
   */
  maxChars: z.number().int().min(100).max(2000).default(600),
}).refine((d) => d.slug || d.contentId, {
  message: 'Either slug or contentId must be provided',
});

export type GetChapterPassageArgs = z.infer<typeof getChapterPassageArgsSchema>;

export const getChapterPassageDefinition: ToolDefinition = {
  name: 'get_chapter_passage',
  description:
    'Retrieve a passage (excerpt) from a specific chapter of a title in the catalogue. Use this when the user asks to "Read me a passage", "Read an excerpt", or clicks the "Read passage" action button. Returns the chapter source URL if full text is not stored locally. Prefer chapter 1 unless the user specifies otherwise.',
  parameters: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: 'URL slug of the content. Use the slug from search_content or fetch_book_details results.',
      },
      contentId: {
        type: 'string',
        description: 'Internal CUID of the content. Use if slug is not available.',
      },
      chapterNumber: {
        type: 'number',
        description: 'Chapter number to fetch (1-indexed). Defaults to 1.',
        default: 1,
      },
      maxChars: {
        type: 'integer',
        description: 'Maximum characters to return from the passage. Default 600, max 2000.',
        default: 600,
      },
    },
    anyOf: [
      { required: ['slug'] },
      { required: ['contentId'] },
    ],
  },
};

export async function executeGetChapterPassage(args: GetChapterPassageArgs) {
  // Resolve content — guard against undefined contentId to satisfy Prisma strict types
  const contentWhere = args.slug
    ? { slug: args.slug }
    : { id: args.contentId as string };

  const content = await prisma.content.findFirst({
    where: contentWhere,
    select: { id: true, title: true, slug: true, chapterCount: true },
  });

  if (!content) {
    return { error: 'Title not found. Use search_content first to find a valid slug or contentId.' };
  }

  // Find the requested chapter
  const chapter = await prisma.chapter.findFirst({
    where: {
      contentId: content.id,
      number: args.chapterNumber,
    },
    select: {
      id: true,
      number: true,
      title: true,
      sourceUrl: true,
      publishedAt: true,
    },
  });

  if (!chapter) {
    // Fall back to the first available chapter
    const firstChapter = await prisma.chapter.findFirst({
      where: { contentId: content.id },
      orderBy: { number: 'asc' },
      select: { id: true, number: true, title: true, sourceUrl: true },
    });

    if (!firstChapter) {
      return {
        error: `No chapters are available yet for "${content.title}" in the Arcanium catalogue. The content may be pending ingestion.`,
        contentTitle: content.title,
        chapterCount: content.chapterCount,
      };
    }

    return {
      contentTitle: content.title,
      contentSlug: content.slug,
      chapterNumber: firstChapter.number,
      chapterTitle: firstChapter.title,
      passage: null,
      note: `Chapter ${args.chapterNumber} was not found. Returning metadata for Chapter ${firstChapter.number} instead. Full text is available at the source.`,
      sourceUrl: firstChapter.sourceUrl,
      readUrl: `/read/${content.slug}/${firstChapter.number}`,
    };
  }

  // NOTE: Phase 4 will store chapter full text in a `bodyText` field on Chapter.
  // Until then, return the chapter metadata + source URL so Liber can narrate
  // the passage description and direct the user to the reader.
  // The frontend will use this to generate a TTS-friendly response.
  return {
    contentTitle: content.title,
    contentSlug: content.slug,
    chapterNumber: chapter.number,
    chapterTitle: chapter.title ?? `Chapter ${chapter.number}`,
    passage: null,
    note: 'Full chapter text will be available once the reader engine (Phase 4) is deployed. The source URL is provided for direct reading.',
    sourceUrl: chapter.sourceUrl,
    publishedAt: chapter.publishedAt,
    readUrl: `/read/${content.slug}/${chapter.number}`,
  };
}
