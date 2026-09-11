import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { UserBadge, ReadingStats } from '@arcanium/types';
import { CreatorApplicationSchema } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Badge definitions — derived from user activity at query time.
// These map milestone conditions to the badge shape the frontend expects.
// ---------------------------------------------------------------------------

function computeBadges(
  completedCount: number,
  totalHours: number,
  aiConversations: number,
  readingStreak: number,
): UserBadge[] {
  const badges: UserBadge[] = [
    {
      id: 'night_owl',
      title: 'Night Owl Archivist',
      desc: 'Read after midnight for 7 consecutive days',
      iconName: 'Moon',
      unlocked: readingStreak >= 7,
      tier: readingStreak >= 7 ? 'Bronze Talisman' : 'Locked',
      colorClasses:
        'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
    },
    {
      id: 'constellation_keeper',
      title: 'Keeper of Constellations',
      desc: 'Finished 5 cosmological tomes and astronomical logs',
      iconName: 'Sparkles',
      unlocked: completedCount >= 5,
      tier: completedCount >= 5 ? 'Silver Talisman' : 'Locked',
      colorClasses:
        'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
    },
    {
      id: 'liber_companion',
      title: 'Companion of Liber',
      desc: 'Conversed with Liber 25 times regarding archive manuscripts',
      iconName: 'BookOpen',
      unlocked: aiConversations >= 25,
      tier: aiConversations >= 25 ? 'Gold Talisman' : `In Progress (${Math.min(aiConversations, 24)}/25)`,
      colorClasses:
        'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
    },
    {
      id: 'master_cartographer',
      title: 'Master Cartographer',
      desc: 'Charted 10 ancient scrolls in the Great Cartography',
      iconName: 'Compass',
      unlocked: completedCount >= 10,
      tier: completedCount >= 10 ? 'Bronze Talisman' : `In Progress (${completedCount}/10)`,
      colorClasses:
        'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    },
    {
      id: 'scribe_of_tomes',
      title: 'Scribe of Tomes',
      desc: 'Shared 20 marginalia reflections across community circles',
      iconName: 'Scroll',
      unlocked: false,
      tier: 'Locked',
      colorClasses:
        'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
    },
    {
      id: 'century_reader',
      title: 'Century Reader',
      desc: `Read 100 hours in the archive (Progress: ${Math.round(totalHours)}/100h)`,
      iconName: 'Clock',
      unlocked: totalHours >= 100,
      tier: totalHours >= 100 ? 'Silver Talisman' : `In Progress (${Math.round((totalHours / 100) * 100)}%)`,
      colorClasses:
        'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',
    },
    {
      id: 'archival_warden',
      title: 'Archival Warden',
      desc: 'Verified 50 community citations and references',
      iconName: 'Shield',
      unlocked: false,
      tier: 'Locked',
      colorClasses:
        'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',
    },
    {
      id: 'legendary_scholar',
      title: 'Legendary Scholar',
      desc: 'Attain rank 5 master archivist credentials in Arcanium',
      iconName: 'Award',
      unlocked: completedCount >= 50,
      tier: completedCount >= 50 ? 'Legendary' : 'Locked',
      colorClasses:
        'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',
    },
  ];
  return badges;
}

function computeArchiveRank(completedCount: number, totalHours: number, streak: number): string {
  const score = completedCount * 3 + Math.floor(totalHours) + streak;
  if (score >= 200) return 'Top 1%';
  if (score >= 100) return 'Top 5%';
  if (score >= 50)  return 'Top 10%';
  if (score >= 20)  return 'Top 25%';
  return 'Rising Scholar';
}

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user.id;

  // Fetch user + reading progress in parallel
  const [user, progressRows, aiActionCount, manualAwards, latestApplication] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        shelves: {
          where: { isDefault: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, sortOrder: true },
        },
      },
    }),
    prisma.readingProgress.findMany({
      where: { userId },
      select: {
        status: true,
        lastReadAt: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    prisma.aiActionLog.count({ where: { userId } }),
    // Manually awarded badges from the admin panel
    prisma.userBadgeAward.findMany({
      where: { userId },
      include: { badge: true },
    }),
    // Latest creator application status (null if no application)
    prisma.creatorApplication.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      select: { status: true },
    }),
  ]);

  if (!user) {
    res.status(404).json({
      data: null,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
    return;
  }

  // Compute stats from real data
  type ProgressRow = (typeof progressRows)[number];
  const completedCount = progressRows.filter((p: ProgressRow) => p.status === 'COMPLETED').length;

  // Estimate hours: avg 3h per completed title + 0.5h per in-progress
  const inProgressCount = progressRows.filter((p: ProgressRow) => p.status === 'READING').length;
  const totalHoursLogged = Math.round(completedCount * 3 + inProgressCount * 0.5);

  // Reading streak: consecutive days with a lastReadAt in the last N days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const readDays = new Set(
    progressRows
      .filter((p: ProgressRow) => p.lastReadAt)
      .map((p: ProgressRow) => {
        const d = new Date(p.lastReadAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
  );

  let readingStreak = 0;
  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    if (readDays.has(day.getTime())) {
      readingStreak++;
    } else if (i > 0) {
      // Gap — streak ends (don't break on day 0 to give grace for today not yet read)
      break;
    }
  }

  const archiveRank = computeArchiveRank(completedCount, totalHoursLogged, readingStreak);

  const stats: ReadingStats = {
    manuscriptsRead: completedCount,
    totalHoursLogged,
    archiveRank,
    readingStreak,
  };

  const badges = computeBadges(completedCount, totalHoursLogged, aiActionCount, readingStreak);

  // Merge manually-awarded badges: mark matching computed badges as unlocked,
  // and append any manual-only badges that aren't in the computed list.
  type ManualAward = (typeof manualAwards)[number];
  const manualIds = new Set(manualAwards.map((a: ManualAward) => a.badge.key));
  const mergedBadges: UserBadge[] = badges.map(b =>
    manualIds.has(b.id) ? { ...b, unlocked: true, tier: manualAwards.find((a: ManualAward) => a.badge.key === b.id)!.badge.tier } : b
  );
  // Append manual-only awards that have no corresponding computed badge
  for (const award of manualAwards) {
    if (!mergedBadges.find(b => b.id === award.badge.key)) {
      mergedBadges.push({
        id:           award.badge.key,
        title:        award.badge.title,
        desc:         award.badge.description,
        iconName:     award.badge.iconName,
        unlocked:     true,
        tier:         award.badge.tier,
        colorClasses: award.badge.colorClasses,
      });
    }
  }

  // Compute archiveLevel (1–5) from combined activity score
  const activityScore = completedCount * 3 + Math.floor(totalHoursLogged) + readingStreak;
  const archiveLevel =
    activityScore >= 200 ? 5
    : activityScore >= 100 ? 4
    : activityScore >= 50  ? 3
    : activityScore >= 20  ? 2
    : 1;

  res.json({
    data: {
      ...user,
      googleId: null,
      archiveLevel,
      role: user.role,
      creatorApplicationStatus: latestApplication?.status ?? null,
      stats,
      badges: mergedBadges,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------

export async function updateMe(req: Request, res: Response): Promise<void> {
  const { displayName, avatarUrl } = req.body as {
    displayName?: string;
    avatarUrl?: string | null;
  };

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  res.json({ data: updated, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/users/creator-application
// ---------------------------------------------------------------------------

export async function submitCreatorApplication(req: Request, res: Response): Promise<void> {
  const userId = req.user.id;

  // Validate body against the shared schema
  const parsed = CreatorApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    });
    return;
  }

  // Prevent duplicate pending applications
  const existing = await prisma.creatorApplication.findFirst({
    where: { userId, status: 'PENDING' },
    select: { id: true },
  });

  if (existing) {
    res.status(409).json({
      data: null,
      error: { code: 'APPLICATION_PENDING', message: 'You already have a pending application under review.' },
    });
    return;
  }

  // Users who are already verified writers don't need to apply
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, displayName: true },
  });

  if (!user) {
    res.status(404).json({ data: null, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return;
  }

  if (user.role === 'VERIFIED_WRITER' || user.role === 'ADMIN' || user.role === 'MODERATOR') {
    res.status(409).json({
      data: null,
      error: { code: 'ALREADY_VERIFIED', message: 'Your account already has creator access.' },
    });
    return;
  }

  const { applicantName, penName, portfolioUrl, sampleTitle, sampleSynopsis, pitch, primaryGenre } = parsed.data;

  const application = await prisma.creatorApplication.create({
    data: {
      userId,
      applicantName,
      penName,
      email: user.email,
      portfolioUrl:   portfolioUrl || null,
      sampleTitle,
      sampleSynopsis,
      pitch,
      primaryGenre,
      status: 'PENDING',
    },
    select: {
      id:            true,
      status:        true,
      penName:       true,
      submittedAt:   true,
    },
  });

  res.status(201).json({ data: application, error: null });
}
