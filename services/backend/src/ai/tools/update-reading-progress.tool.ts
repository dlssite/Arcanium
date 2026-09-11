import { z } from 'zod';
import { ReadingStatusSchema } from '@arcanium/types';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const updateReadingProgressArgsSchema = z.object({
  contentId: z.string().cuid(),
  status: ReadingStatusSchema.optional(),
  lastChapterRead: z.number().optional(),
});

export type UpdateReadingProgressArgs = z.infer<typeof updateReadingProgressArgsSchema>;

export const updateReadingProgressDefinition: ToolDefinition = {
  name: 'update_reading_progress',
  description:
    'Update the reading status or last-read chapter for a title in the user\'s library. When status changes, the entry is automatically moved to the matching system shelf.',
  parameters: {
    type: 'object',
    properties: {
      contentId: { type: 'string', description: 'The content ID to update.' },
      status: {
        type: 'string',
        enum: ['READING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_READ'],
        description: 'New reading status. Omit if only updating chapter number.',
      },
      lastChapterRead: {
        type: 'number',
        description: 'The chapter number just read. Omit if only updating status.',
      },
    },
    required: ['contentId'],
  },
};

// Map ReadingStatus to system shelf name
const STATUS_TO_SHELF: Record<string, string> = {
  READING: 'Reading',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
  PLAN_TO_READ: 'Plan to Read',
};

export async function executeUpdateReadingProgress(
  userId: string,
  args: UpdateReadingProgressArgs,
) {
  const now = new Date();

  const progress = await prisma.readingProgress.upsert({
    where: { userId_contentId: { userId, contentId: args.contentId } },
    update: {
      ...(args.status ? { status: args.status } : {}),
      ...(args.lastChapterRead !== undefined ? { lastChapterRead: args.lastChapterRead } : {}),
      lastReadAt: now,
      ...(args.status === 'COMPLETED' ? { completedAt: now } : {}),
    },
    create: {
      userId,
      contentId: args.contentId,
      status: args.status ?? 'READING',
      lastChapterRead: args.lastChapterRead ?? null,
      lastReadAt: now,
      startedAt: now,
    },
  });

  // Move to matching system shelf when status changes
  if (args.status) {
    const targetShelfName = STATUS_TO_SHELF[args.status];
    if (targetShelfName) {
      const shelf = await prisma.shelf.findFirst({
        where: { userId, name: targetShelfName, isDefault: true },
      });
      if (shelf) {
        await prisma.shelfEntry.upsert({
          where: { shelfId_contentId: { shelfId: shelf.id, contentId: args.contentId } },
          update: {},
          create: { shelfId: shelf.id, contentId: args.contentId },
        });
      }
    }
  }

  return {
    success: true,
    status: progress.status,
    lastChapterRead: progress.lastChapterRead,
    updatedEntities: ['library', `progress:${args.contentId}`],
  };
}
