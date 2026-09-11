import { z } from 'zod';
import { ContentTypeSchema } from '@arcanium/types';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const getRecommendationsArgsSchema = z.object({
  mood: z.string().optional(),
  contentType: ContentTypeSchema.optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export type GetRecommendationsArgs = z.infer<typeof getRecommendationsArgsSchema>;

export const getRecommendationsDefinition: ToolDefinition = {
  name: 'get_recommendations',
  description:
    'Generate personalised reading recommendations based on the user\'s preferences and library history. Excludes titles already in the user\'s library.',
  parameters: {
    type: 'object',
    properties: {
      mood: { type: 'string', description: 'Current reading mood to bias recommendations.' },
      contentType: {
        type: 'string',
        enum: ['WEB_NOVEL', 'LIGHT_NOVEL', 'COMIC', 'MANGA', 'EBOOK', 'WEBTOON'],
        description: 'Restrict to a specific type. Optional.',
      },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    },
  },
};

export async function executeGetRecommendations(
  userId: string,
  args: GetRecommendationsArgs,
) {
  // Get IDs of content already in user's library to exclude
  const ownedEntries = await prisma.shelfEntry.findMany({
    where: { shelf: { userId } },
    select: { contentId: true },
  });
  const ownedIds = ownedEntries.map((e) => e.contentId);

  // Load user preferences from AiMemory
  const memory = await prisma.aiMemory.findUnique({ where: { userId } });
  const preferences = (memory?.preferences ?? {}) as Record<string, unknown>;
  const preferredGenres = Array.isArray(preferences['genres'])
    ? (preferences['genres'] as string[])
    : [];

  // Query catalogue — exclude owned, filter by type if specified
  const candidates = await prisma.content.findMany({
    where: {
      id: { notIn: ownedIds },
      ...(args.contentType ? { type: args.contentType } : {}),
    },
    orderBy: [{ rating: 'desc' }, { chapterCount: 'desc' }],
    take: args.limit * 3, // fetch extra to allow genre scoring
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      author: true,
      coverImageUrl: true,
      synopsis: true,
      rating: true,
      chapterCount: true,
      metadata: true,
    },
  });

  // Score by genre match if user has preferences
  const scored = candidates
    .map((c) => {
      const genres = Array.isArray((c.metadata as Record<string, unknown>)?.['genres'])
        ? ((c.metadata as Record<string, unknown>)['genres'] as string[])
        : [];
      const genreMatch = preferredGenres.filter((g) => genres.includes(g)).length;
      return { ...c, _score: genreMatch + (c.rating ?? 0) };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, args.limit);

  return {
    count: scored.length,
    mood: args.mood,
    results: scored.map(({ _score, metadata, ...rest }) => rest),
  };
}
