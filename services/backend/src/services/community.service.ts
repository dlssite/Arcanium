import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

function archiveRole(level: number): string {
  const roles: Record<number, string> = {
    1: 'Level 1 Apprentice',
    2: 'Level 2 Archivist',
    3: 'Level 3 Archivist',
    4: 'Level 4 Scholar Archivist',
    5: 'Level 5 Master Archivist',
  };
  return roles[level] ?? 'Archivist';
}

// ---------------------------------------------------------------------------
// GET /api/v1/community/overview
// Single endpoint returns circles + posts + active challenge together.
// Avoids a waterfall of three separate requests from the frontend.
// ---------------------------------------------------------------------------

export async function getCommunityOverview(_req: Request, res: Response): Promise<void> {
  const [circles, posts, challenge] = await Promise.all([
    // Reading circles with member count and live session count
    prisma.readingCircle.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { members: true } },
        sessions: { select: { activeNow: true } },
      },
    }),

    // Most recent marginalia posts with author data
    prisma.marginaliaPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }),

    // Current active challenge (ends in the future)
    prisma.communityChallenge.findFirst({
      where: { endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'asc' },
    }),
  ]);

  const shapedCircles = circles.map((c: (typeof circles)[number]) => ({
    id: c.id,
    name: c.name,
    tag: c.tag,
    focusTitle: c.focusTitle,
    memberCount: c._count.members,
    activeNow: c.sessions[0]?.activeNow ?? 0,
  }));

  const shapedPosts = posts.map((p: (typeof posts)[number]) => ({
    id: p.id,
    author: p.author.displayName,
    authorId: p.author.id,
    role: archiveRole(1),      // archiveLevel not in schema yet — default to 1
    avatarUrl: p.author.avatarUrl,
    time: relativeTime(p.createdAt),
    book: p.bookTitle,
    chapter: p.chapter,
    quote: p.quote,
    reflection: p.reflection,
    echoCount: p.echoCount,
    replyCount: p.replyCount,
  }));

  const shapedChallenge = challenge
    ? {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        targetPages: challenge.targetPages,
        completedPages: challenge.completedPages,
        progressPercent: Math.round((challenge.completedPages / challenge.targetPages) * 100),
        badgeReward: challenge.badgeReward,
        totalScholars: challenge.totalScholars,
        endsAt: challenge.endsAt.toISOString(),
      }
    : null;

  res.json({
    data: { circles: shapedCircles, posts: shapedPosts, challenge: shapedChallenge },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/community/echo/:postId
// Optimistic echo — increments counter, returns new count.
// ---------------------------------------------------------------------------

export async function echoPost(req: Request, res: Response): Promise<void> {
  const { postId } = req.params as { postId: string };

  const updated = await prisma.marginaliaPost.update({
    where: { id: postId },
    data: { echoCount: { increment: 1 } },
    select: { id: true, echoCount: true },
  });

  res.json({ data: { postId: updated.id, echoCount: updated.echoCount }, error: null });
}
