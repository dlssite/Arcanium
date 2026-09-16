import { prisma } from '../lib/prisma.js';
import { SYSTEM_PROMPT_STATIC } from './prompts/system.js';

export async function assembleSystemPrompt(userId: string): Promise<string> {
  const [user, memory, recentProgress, recentMoods, userCircles, collections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.aiMemory.findUnique({
      where: { userId },
      select: { preferenceSummary: true, preferences: true, lastContext: true },
    }),
    // Get recent reading activity
    prisma.readingProgress.findMany({
      where: { userId, status: { in: ['READING', 'COMPLETED'] } },
      orderBy: { lastReadAt: 'desc' },
      take: 3,
      include: { content: { select: { title: true, type: true } } },
    }),
    // Get recent mood entries
    prisma.aiMoodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { mood: true, createdAt: true },
    }),
    // Get user's reading circles
    prisma.circleMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        circle: {
          select: { 
            name: true, 
            description: true, 
            visibility: true,
            _count: { select: { members: true } }
          }
        }
      },
      take: 5,
    }),
    // Get special collections
    prisma.collection.findMany({
      where: { enabled: true },
      select: {
        name: true,
        description: true,
        slug: true,
        _count: { select: { entries: true } }
      },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    }),
  ]);

  const sections: string[] = [SYSTEM_PROMPT_STATIC];

  sections.push(`\n## User Context\nName: ${user?.displayName ?? 'Scholar'}`);

  if (memory?.preferenceSummary) {
    sections.push(`Preferences: ${memory.preferenceSummary}`);
  }

  if (memory?.preferences) {
    const prefs = memory.preferences as Record<string, unknown>;
    const genres = Array.isArray(prefs['genres']) ? (prefs['genres'] as string[]).join(', ') : null;
    const avoid = Array.isArray(prefs['avoidTags']) ? (prefs['avoidTags'] as string[]).join(', ') : null;
    if (genres) sections.push(`Likes: ${genres}`);
    if (avoid) sections.push(`Avoids: ${avoid}`);
  }

  // Add recent reading activity
  if (recentProgress.length > 0) {
    const currently = recentProgress.filter((p) => p.status === 'READING');
    const recent = recentProgress.filter((p) => p.status === 'COMPLETED').slice(0, 2);
    
    if (currently.length > 0) {
      const titles = currently.map((p) => `"${p.content.title}"`).join(', ');
      sections.push(`Currently reading: ${titles}`);
    }
    if (recent.length > 0) {
      const titles = recent.map((p) => `"${p.content.title}"`).join(', ');
      sections.push(`Recently finished: ${titles}`);
    }
  }

  // Add recent moods
  if (recentMoods.length > 0) {
    const latestMood = recentMoods[0];
    if (latestMood) {
      const moodAge = Date.now() - latestMood.createdAt.getTime();
      const isRecent = moodAge < 24 * 60 * 60 * 1000; // within 24h
      if (isRecent) {
        sections.push(`Recent mood: ${latestMood.mood}`);
      }
    }
  }

  // Add user's reading circles
  if (userCircles.length > 0) {
    const circleNames = userCircles.map(m => {
      const c = m.circle;
      const members = c._count.members;
      return `"${c.name}" - ${members} members`;
    }).join(', ');
    sections.push(`Member of circles: ${circleNames}`);
  }

  // Add available special collections
  if (collections.length > 0) {
    const collectionList = collections.map(col => {
      const count = col._count.entries;
      return `"${col.name}" (${count} titles)`;
    }).join(', ');
    sections.push(`\n## Special Collections Available\n${collectionList}`);
    sections.push(`Note: You can recommend books from these curated collections to match the scholar's interests.`);
  }

  if (memory?.lastContext) {
    const ctx = memory.lastContext as Record<string, unknown>;
    if (ctx['sessionSummary']) {
      sections.push(`Last chat: ${String(ctx['sessionSummary'])}`);
    }
  }

  return sections.join('\n');
}

/**
 * Persist the last context after a successful chat turn.
 * Non-blocking — called with void after the response is sent.
 */
export async function updateLastContext(
  userId: string,
  context: Record<string, unknown>,
): Promise<void> {
  await prisma.aiMemory.upsert({
    where: { userId },
    update: { lastContext: context as object },
    create: { userId, lastContext: context as object },
  });
}
