import { prisma } from '../lib/prisma.js';
import { SYSTEM_PROMPT_STATIC } from './prompts/system.js';

/**
 * Assembles the full system prompt from the static persona + dynamic user context.
 * Loaded from AiMemory before every request.
 * Kept under ~1500 tokens total to leave room for conversation history + tools.
 */
export async function assembleSystemPrompt(userId: string): Promise<string> {
  const [user, memory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.aiMemory.findUnique({
      where: { userId },
      select: { preferenceSummary: true, preferences: true, lastContext: true },
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
    if (genres) sections.push(`Preferred genres: ${genres}`);
    if (avoid) sections.push(`Avoid: ${avoid}`);
  }

  if (memory?.lastContext) {
    const ctx = memory.lastContext as Record<string, unknown>;
    if (ctx['lastContentTitle']) {
      sections.push(`Last reading: "${String(ctx['lastContentTitle'])}"`);
    }
    if (ctx['currentMood']) {
      sections.push(`Current mood: ${String(ctx['currentMood'])}`);
    }
    if (ctx['sessionSummary']) {
      sections.push(`Last session: ${String(ctx['sessionSummary'])}`);
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
