import { z } from 'zod';
import { ContentTypeSchema } from '@arcanium/types';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const searchContentArgsSchema = z.object({
  query: z.string().min(1).max(200),
  contentType: ContentTypeSchema.optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export type SearchContentArgs = z.infer<typeof searchContentArgsSchema>;

export const searchContentDefinition: ToolDefinition = {
  name: 'search_content',
  description:
    'Search the Arcanium catalogue for reading material by title, author, or genre. Returns a ranked list of matching titles. Use this whenever the user asks to find, discover, or look up a title. Accepts descriptive phrases.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query — title, author, genre, or descriptive phrase.' },
      contentType: {
        type: 'string',
        enum: ['WEB_NOVEL', 'LIGHT_NOVEL', 'COMIC', 'MANGA', 'EBOOK', 'WEBTOON'],
        description: 'Filter to a specific content type. Omit to search all types.',
      },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    },
    required: ['query'],
  },
};

export async function executeSearchContent(args: SearchContentArgs) {
  const results = await prisma.content.findMany({
    where: {
      ...(args.contentType ? { type: args.contentType } : {}),
      OR: [
        { title: { contains: args.query, mode: 'insensitive' } },
        { author: { contains: args.query, mode: 'insensitive' } },
        { synopsis: { contains: args.query, mode: 'insensitive' } },
      ],
    },
    take: args.limit,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      author: true,
      coverImageUrl: true,
      synopsis: true,
      sourceSite: true,
      chapterCount: true,
      rating: true,
    },
  });

  return {
    count: results.length,
    results,
  };
}
