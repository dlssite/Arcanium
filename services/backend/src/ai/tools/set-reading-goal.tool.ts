import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const setReadingGoalArgsSchema = z.object({
  /**
   * Daily reading goal in minutes.
   * Constrained to sensible human range: 5 min to 8 hours.
   */
  targetMinutes: z
    .number()
    .int()
    .min(5, 'Goal must be at least 5 minutes')
    .max(480, 'Goal cannot exceed 8 hours (480 minutes)'),
  /**
   * Optional affirmation message Liber will echo back.
   * If the AI provides this, the frontend shows it as Liber's confirmation reply.
   */
  affirmation: z.string().max(200).optional(),
});

export type SetReadingGoalArgs = z.infer<typeof setReadingGoalArgsSchema>;

export const setReadingGoalDefinition: ToolDefinition = {
  name: 'set_reading_goal',
  description:
    'Set the user\'s daily reading goal in minutes. Use this when the user says things like "Set my goal to 30 minutes a day", "I want to read for an hour daily", or "Change my reading target". Always confirm the new goal in your reply. Reasonable defaults: 15 min (light reader), 30 min (regular), 60 min (dedicated).',
  parameters: {
    type: 'object',
    properties: {
      targetMinutes: {
        type: 'integer',
        description: 'The daily reading goal in minutes. Must be between 5 and 480.',
        minimum: 5,
        maximum: 480,
      },
      affirmation: {
        type: 'string',
        description: 'A short, encouraging confirmation message (1–2 sentences). Will be shown to the user in Liber\'s reply.',
      },
    },
    required: ['targetMinutes'],
  },
};

export async function executeSetReadingGoal(userId: string, args: SetReadingGoalArgs) {
  // Persist goal in AiMemory preferences so it survives sessions
  await prisma.aiMemory.upsert({
    where: { userId },
    update: {
      preferences: {
        // Merge into existing preferences
        dailyGoalMinutes: args.targetMinutes,
      },
    },
    create: {
      userId,
      preferences: {
        dailyGoalMinutes: args.targetMinutes,
      },
    },
  });

  // Format the goal as a human-readable string for the reply
  const hours   = Math.floor(args.targetMinutes / 60);
  const minutes = args.targetMinutes % 60;
  const formatted =
    hours > 0 && minutes > 0 ? `${hours}h ${minutes}m`
    : hours > 0              ? `${hours} hour${hours > 1 ? 's' : ''}`
    : `${minutes} minute${minutes !== 1 ? 's' : ''}`;

  return {
    success: true,
    targetMinutes: args.targetMinutes,
    formattedGoal: formatted,
    affirmation: args.affirmation ?? `Your daily reading goal has been set to ${formatted}. The archive awaits, scholar.`,
    // Signal to the frontend to update useUserStore.dailyGoal
    updatedEntities: ['user:dailyGoal'],
  };
}
