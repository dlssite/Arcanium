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
  const ownedIds = ownedEntries.map((e: { contentId: string }) => e.contentId);

  // Load user preferences and recent mood history from AiMemory
  const [memory, recentMoods, recentProgress] = await Promise.all([
    prisma.aiMemory.findUnique({ where: { userId } }),
    prisma.aiMoodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { mood: true, recommendations: true },
    }),
    prisma.readingProgress.findMany({
      where: { userId, status: { in: ['COMPLETED', 'READING'] } },
      orderBy: { lastReadAt: 'desc' },
      take: 10,
      include: { content: { select: { type: true, metadata: true } } },
    }),
  ]);

  const preferences = (memory?.preferences ?? {}) as Record<string, unknown>;
  const preferredGenres = Array.isArray(preferences['genres'])
    ? (preferences['genres'] as string[])
    : [];

  // Extract genres from recently read content for pattern detection
  const recentGenres = recentProgress
    .flatMap((p) => {
      const meta = p.content.metadata as Record<string, unknown> | null;
      return Array.isArray(meta?.['genres']) ? (meta['genres'] as string[]) : [];
    })
    .filter((g, i, arr) => arr.indexOf(g) === i); // unique

  // Combine preferred + recent genres, weight preferred higher
  const allGenres = [...preferredGenres, ...recentGenres];

  // Build mood-based filter hints
  const moodKeywords: Record<string, string[]> = {
    adventurous: ['adventure', 'action', 'quest'],
    cozy: ['slice of life', 'wholesome', 'comfort'],
    'emotionally-heavy': ['drama', 'tragedy', 'psychological'],
    funny: ['comedy', 'parody', 'humor'],
    'fast-paced': ['action', 'thriller', 'adventure'],
    'slow-burn': ['romance', 'drama', 'slice of life'],
    'mind-bending': ['psychological', 'mystery', 'sci-fi'],
    nostalgic: ['slice of life', 'coming of age'],
    escapist: ['fantasy', 'isekai', 'adventure'],
    dark: ['horror', 'dark fantasy', 'thriller'],
    light: ['comedy', 'slice of life', 'wholesome'],
    romantic: ['romance', 'shoujo', 'josei'],
    'action-packed': ['action', 'shounen', 'adventure'],
    philosophical: ['psychological', 'drama', 'sci-fi'],
    'comfort-read': ['slice of life', 'wholesome', 'comedy'],
  };

  const moodGenres = args.mood ? (moodKeywords[args.mood.toLowerCase()] ?? []) : [];

  // Query catalogue — exclude owned, filter by type if specified
  const candidates = await prisma.content.findMany({
    where: {
      id: { notIn: ownedIds },
      ...(args.contentType ? { type: args.contentType } : {}),
    },
    orderBy: [{ rating: 'desc' }, { chapterCount: 'desc' }],
    take: args.limit * 5, // fetch extra for scoring
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

  // Score by: genre match + mood match + rating
  const scored = candidates
    .map((c) => {
      const genres = Array.isArray((c.metadata as Record<string, unknown>)?.['genres'])
        ? ((c.metadata as Record<string, unknown>)['genres'] as string[])
        : [];
      
      // Genre preference match
      const genreMatch = allGenres.filter((g: string) => 
        genres.some((cg) => cg.toLowerCase().includes(g.toLowerCase()))
      ).length;

      // Mood-based genre match
      const moodMatch = args.mood 
        ? moodGenres.filter((mg) => 
            genres.some((cg) => cg.toLowerCase().includes(mg.toLowerCase()))
          ).length * 2 // weight mood higher
        : 0;

      const ratingBoost = (c.rating ?? 0) * 0.5;
      
      return { ...c, _score: genreMatch + moodMatch + ratingBoost };
    })
    .sort((a: { _score: number }, b: { _score: number }) => b._score - a._score)
    .slice(0, args.limit);

  return {
    count: scored.length,
    mood: args.mood,
    results: scored.map(({ _score, metadata, ...rest }: { _score: number; metadata: unknown; [key: string]: unknown }) => rest),
  };
}
