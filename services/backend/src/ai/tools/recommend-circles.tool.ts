import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const recommendCirclesArgsSchema = z.object({
  interest: z.string().optional().describe('Topic or interest to find circles for'),
  limit: z.number().int().min(1).max(5).default(3),
});

export type RecommendCirclesArgs = z.infer<typeof recommendCirclesArgsSchema>;

export const recommendCirclesDefinition: ToolDefinition = {
  name: 'recommend_circles',
  description:
    'Recommend reading circles for the scholar to join based on their interests. Returns active, public circles with member counts and descriptions.',
  parameters: {
    type: 'object',
    properties: {
      interest: { 
        type: 'string', 
        description: 'Optional topic or interest (e.g., "fantasy", "romance", "sci-fi") to filter circles. If not provided, returns popular circles.' 
      },
      limit: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
    },
  },
};

export async function executeRecommendCircles(
  args: RecommendCirclesArgs,
  userId: string,
): Promise<string> {
  const { interest, limit } = args;

  // Build filter
  const where: any = {
    visibility: 'PUBLIC',
    isArchived: false,
  };

  // If interest is provided, search in name or description
  if (interest) {
    where.OR = [
      { name: { contains: interest, mode: 'insensitive' } },
      { description: { contains: interest, mode: 'insensitive' } },
    ];
  }

  // Get circles the user is NOT already a member of
  const userCircleIds = await prisma.circleMember.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { circleId: true },
  });

  if (userCircleIds.length > 0) {
    where.id = { notIn: userCircleIds.map(m => m.circleId) };
  }

  const circles = await prisma.readingCircle.findMany({
    where,
    take: limit,
    orderBy: [
      { isFeatured: 'desc' },
      { members: { _count: 'desc' } },
    ],
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { members: true } },
      owner: { select: { displayName: true } },
    },
  });

  if (circles.length === 0) {
    return interest
      ? `No public circles found matching "${interest}". The scholar might create one or explore other topics.`
      : 'No public circles available at the moment. The scholar might create the first one!';
  }

  const recommendations = circles.map((c: any, idx: number) => {
    const members = c._count.members;
    const owner = c.owner.displayName;
    return `${idx + 1}. **${c.name}**\n   ${c.description || 'A gathering of readers'}\n   ${members} members · Created by ${owner}`;
  }).join('\n\n');

  const intro = interest
    ? `Found ${circles.length} reading circle(s) for "${interest}":`
    : `Here are ${circles.length} popular reading circles:`;

  return `${intro}\n\n${recommendations}\n\nWould you like to know more about any of these circles?`;
}
