import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const fetchBookDetailsArgsSchema = z.object({
  /**
   * Accept either a slug (preferred, URL-safe) or the internal content ID.
   * The AI should pass the slug from search_content results where available.
   */
  slug: z.string().min(1).max(200).optional(),
  contentId: z.string().cuid().optional(),
}).refine((d) => d.slug || d.contentId, {
  message: 'Either slug or contentId must be provided',
});

export type FetchBookDetailsArgs = z.infer<typeof fetchBookDetailsArgsSchema>;

export const fetchBookDetailsDefinition: ToolDefinition = {
  name: 'fetch_book_details',
  description:
    'Retrieve full details about a specific title: synopsis, author, chapter count, reading time estimate, rating, genres, and source site. Use this when the user asks "Tell me more", "What is this book about?", or "Describe this title." Always follow up search_content with this tool before recommending.',
  parameters: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: 'The URL slug of the content (preferred). Use the slug field from search_content results.',
      },
      contentId: {
        type: 'string',
        description: 'The internal CUID of the content. Use if slug is not available.',
      },
    },
    // At least one of slug or contentId must be present
    anyOf: [
      { required: ['slug'] },
      { required: ['contentId'] },
    ],
  },
};

export async function executeFetchBookDetails(args: FetchBookDetailsArgs) {
  const contentWhere = args.slug
    ? { slug: args.slug }
    : { id: args.contentId as string };

  const content = await prisma.content.findFirst({
    where: contentWhere,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      status: true,
      author: true,
      artist: true,
      synopsis: true,
      coverImageUrl: true,
      language: true,
      sourceSite: true,
      chapterCount: true,
      rating: true,
      metadata: true,
      createdAt: true,
    },
  });

  if (!content) {
    return {
      error: 'Title not found in the Arcanium catalogue. Try searching by name with search_content first.',
    };
  }

  // Fetch the first chapter separately
  const firstChapter = await prisma.chapter.findFirst({
    where: { contentId: content.id },
    orderBy: { number: 'asc' },
    select: { number: true, title: true, publishedAt: true },
  });

  const metadata = (content.metadata ?? {}) as Record<string, unknown>;
  const genres = Array.isArray(metadata['genres']) ? (metadata['genres'] as string[]) : [];
  const tags   = Array.isArray(metadata['tags'])   ? (metadata['tags']   as string[]) : [];

  // Rough reading time estimate: assume 3 minutes per chapter average
  const estimatedReadMinutes = content.chapterCount > 0 ? content.chapterCount * 3 : null;
  const readTimeFormatted = estimatedReadMinutes
    ? estimatedReadMinutes >= 60
      ? `${Math.floor(estimatedReadMinutes / 60)}h ${estimatedReadMinutes % 60}m`
      : `${estimatedReadMinutes}m`
    : null;

  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    type: content.type,
    status: content.status,
    author: content.author,
    artist: content.artist,
    synopsis: content.synopsis ?? 'No synopsis available.',
    coverImageUrl: content.coverImageUrl,
    sourceSite: content.sourceSite,
    chapterCount: content.chapterCount,
    estimatedReadTime: readTimeFormatted,
    rating: content.rating,
    genres,
    tags,
    firstChapter: firstChapter ?? null,
  };
}
