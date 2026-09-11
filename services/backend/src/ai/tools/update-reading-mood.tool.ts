import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const updateReadingMoodArgsSchema = z.object({
  mood: z.string().min(1).max(50),
  rawInput: z.string().max(1000).optional(),
  recommendations: z.array(z.string()).max(10).default([]),
});

export type UpdateReadingMoodArgs = z.infer<typeof updateReadingMoodArgsSchema>;

export const updateReadingMoodDefinition: ToolDefinition = {
  name: 'update_reading_mood',
  description:
    'Record the user\'s current reading mood. Call this when the user expresses how they feel or what kind of reading experience they want. Use consistent mood tags: adventurous, cozy, emotionally-heavy, funny, fast-paced, slow-burn, mind-bending, nostalgic, escapist.',
  parameters: {
    type: 'object',
    properties: {
      mood: { type: 'string', description: 'Concise mood label from the standard set.' },
      rawInput: { type: 'string', description: "The user's exact message that revealed this mood." },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Content IDs being recommended in response to this mood.',
      },
    },
    required: ['mood'],
  },
};

export async function executeUpdateReadingMood(userId: string, args: UpdateReadingMoodArgs) {
  const entry = await prisma.aiMoodEntry.create({
    data: {
      userId,
      mood: args.mood,
      rawInput: args.rawInput ?? null,
      recommendations: args.recommendations,
    },
  });

  // Update AiMemory lastContext with current mood
  await prisma.aiMemory.upsert({
    where: { userId },
    update: {
      lastContext: { currentMood: args.mood, updatedAt: new Date().toISOString() } as object,
    },
    create: {
      userId,
      lastContext: { currentMood: args.mood, updatedAt: new Date().toISOString() } as object,
    },
  });

  return { success: true, mood: args.mood, entryId: entry.id };
}
