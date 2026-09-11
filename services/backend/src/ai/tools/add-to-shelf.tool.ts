import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const addToShelfArgsSchema = z.object({
  contentId: z.string().cuid(),
  shelfName: z.string().min(1).max(100),
  createIfMissing: z.boolean().default(false),
  note: z.string().max(500).optional(),
});

export type AddToShelfArgs = z.infer<typeof addToShelfArgsSchema>;

export const addToShelfDefinition: ToolDefinition = {
  name: 'add_to_shelf',
  description:
    'Add a content title to a named shelf in the user\'s library. Use this when the user asks to save, bookmark, or add something to their library. Always use a contentId from a prior search_content result — never invent one.',
  parameters: {
    type: 'object',
    properties: {
      contentId: { type: 'string', description: 'The internal ID of the content to add. Must come from search_content results.' },
      shelfName: { type: 'string', description: 'Shelf name. Use system shelves: Reading, Completed, On Hold, Dropped, Plan to Read. Or a custom shelf name.' },
      createIfMissing: { type: 'boolean', default: false, description: 'Create the shelf if it does not exist.' },
      note: { type: 'string', description: 'Optional personal note to attach to this entry.' },
    },
    required: ['contentId', 'shelfName'],
  },
};

export async function executeAddToShelf(userId: string, args: AddToShelfArgs) {
  // Verify content exists
  const content = await prisma.content.findUnique({
    where: { id: args.contentId },
    select: { id: true, title: true },
  });
  if (!content) {
    return { error: 'Content not found. Please search for the title first.' };
  }

  // Find or create shelf
  let shelf = await prisma.shelf.findFirst({
    where: { userId, name: args.shelfName },
  });

  if (!shelf) {
    if (!args.createIfMissing) {
      return {
        error: `Shelf "${args.shelfName}" not found. Available system shelves: Reading, Completed, On Hold, Dropped, Plan to Read.`,
      };
    }
    shelf = await prisma.shelf.create({
      data: { userId, name: args.shelfName, isDefault: false },
    });
  }

  // Upsert shelf entry
  await prisma.shelfEntry.upsert({
    where: { shelfId_contentId: { shelfId: shelf.id, contentId: args.contentId } },
    update: { note: args.note ?? null },
    create: { shelfId: shelf.id, contentId: args.contentId, note: args.note ?? null },
  });

  // Ensure ReadingProgress row exists
  await prisma.readingProgress.upsert({
    where: { userId_contentId: { userId, contentId: args.contentId } },
    update: {},
    create: { userId, contentId: args.contentId, status: 'PLAN_TO_READ' },
  });

  return {
    success: true,
    contentTitle: content.title,
    shelfName: shelf.name,
    created: !shelf.isDefault,
  };
}
