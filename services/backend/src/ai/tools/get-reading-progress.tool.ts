import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const getReadingProgressArgsSchema = z.object({
  contentId: z.string().cuid(),
});

export type GetReadingProgressArgs = z.infer<typeof getReadingProgressArgsSchema>;

export const getReadingProgressDefinition: ToolDefinition = {
  name: 'get_reading_progress',
  description: 'Look up the user\'s reading status and progress for a specific title.',
  parameters: {
    type: 'object',
    properties: {
      contentId: { type: 'string', description: 'The content ID to look up.' },
    },
    required: ['contentId'],
  },
};

export async function executeGetReadingProgress(userId: string, args: GetReadingProgressArgs) {
  const progress = await prisma.readingProgress.findUnique({
    where: { userId_contentId: { userId, contentId: args.contentId } },
    select: {
      status: true,
      lastChapterRead: true,
      lastReadAt: true,
      startedAt: true,
      completedAt: true,
    },
  });

  if (!progress) {
    return { found: false, message: 'No reading progress found for this title.' };
  }

  return {
    found: true,
    status: progress.status,
    lastChapterRead: progress.lastChapterRead,
    lastReadAt: progress.lastReadAt?.toISOString() ?? null,
    startedAt: progress.startedAt?.toISOString() ?? null,
    completedAt: progress.completedAt?.toISOString() ?? null,
  };
}
