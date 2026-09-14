/**
 * XP Service
 *
 * Central place for all XP logic. Everything that awards XP calls grantXp().
 * Ranks are loaded from the DB (RankDefinition table) — admin-manageable.
 * XP source amounts are stored in AppConfig and cached for 5 minutes.
 *
 * XP sources (defaults, overridable via admin panel):
 *   BOOK_COMPLETE     100 xp
 *   CHAPTER_READ        5 xp  (once per chapter per user)
 *   REVIEW_SUBMIT      25 xp  (once per book per user)
 *   LIBRARY_ADD         2 xp  (once per book per user)
 *   STREAK_7_DAY       50 xp  (once per 7-day streak milestone)
 *   STREAK_30_DAY     200 xp  (once per 30-day streak milestone)
 */

import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// XP source keys — stored in AppConfig as "xp.<source_lower>"
// ---------------------------------------------------------------------------
export const XP_SOURCES = [
  'BOOK_COMPLETE',
  'CHAPTER_READ',
  'REVIEW_SUBMIT',
  'LIBRARY_ADD',
  'STREAK_7_DAY',
  'STREAK_30_DAY',
] as const;

export type XpSource = (typeof XP_SOURCES)[number];

/** Defaults used when AppConfig has no override */
export const XP_DEFAULTS: Record<XpSource, number> = {
  BOOK_COMPLETE:  100,
  CHAPTER_READ:     5,
  REVIEW_SUBMIT:   25,
  LIBRARY_ADD:      2,
  STREAK_7_DAY:    50,
  STREAK_30_DAY:  200,
};

export type XpConfig = Record<XpSource, number>;

// ---------------------------------------------------------------------------
// In-memory cache for XP config (5-minute TTL)
// ---------------------------------------------------------------------------
let _xpConfigCache: XpConfig | null = null;
let _xpConfigCachedAt = 0;
const XP_CONFIG_TTL_MS = 5 * 60 * 1000;

export function invalidateXpConfigCache() {
  _xpConfigCache = null;
  _xpConfigCachedAt = 0;
}

export async function getXpConfig(): Promise<XpConfig> {
  const now = Date.now();
  if (_xpConfigCache && now - _xpConfigCachedAt < XP_CONFIG_TTL_MS) {
    return _xpConfigCache;
  }

  const rows = await prisma.appConfig.findMany({
    where: { key: { startsWith: 'xp.' } },
  });

  const config = { ...XP_DEFAULTS };
  for (const row of rows) {
    const source = row.key.replace('xp.', '').toUpperCase() as XpSource;
    if (source in config) {
      const val = parseInt(row.value, 10);
      if (!isNaN(val) && val >= 0) config[source] = val;
    }
  }

  _xpConfigCache = config;
  _xpConfigCachedAt = now;
  return config;
}

// ---------------------------------------------------------------------------
// getRanks — fetches enabled ranks ordered by level, cached per request cycle
// ---------------------------------------------------------------------------
export async function getRanks() {
  return prisma.rankDefinition.findMany({
    where:   { enabled: true },
    orderBy: { level: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// computeRank — derive current rank + progress from totalXp + rank list
// ---------------------------------------------------------------------------
export function computeRank(
  totalXp: number,
  ranks: Awaited<ReturnType<typeof getRanks>>,
) {
  if (!ranks.length) {
    return { rank: null, nextRank: null, xpIntoLevel: totalXp, xpNeeded: 0, progressPct: 100 };
  }

  // Find the highest rank the user qualifies for
  let current = ranks[0];
  for (const r of ranks) {
    if (totalXp >= r.xpRequired) current = r;
    else break;
  }

  const currentIndex = ranks.indexOf(current);
  const nextRank = ranks[currentIndex + 1] ?? null;

  const xpIntoLevel = nextRank
    ? totalXp - current.xpRequired
    : totalXp - current.xpRequired;

  const xpNeeded = nextRank
    ? nextRank.xpRequired - current.xpRequired
    : 0;

  const progressPct = nextRank
    ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100))
    : 100;

  return { rank: current, nextRank, xpIntoLevel, xpNeeded, progressPct };
}

// ---------------------------------------------------------------------------
// grantXp — award XP to a user, idempotent for once-per-event sources
// ---------------------------------------------------------------------------
export async function grantXp(
  userId:   string,
  source:   XpSource,
  meta:     Record<string, unknown> = {},
): Promise<{ granted: boolean; amount: number; totalXp: number }> {
  const config = await getXpConfig();
  const amount = config[source];

  // Idempotency: LIBRARY_ADD, REVIEW_SUBMIT, BOOK_COMPLETE, CHAPTER_READ
  // are once-per-content-per-user. Check by (userId, source, meta.contentId).
  if (meta.contentId && ['LIBRARY_ADD', 'REVIEW_SUBMIT', 'BOOK_COMPLETE', 'CHAPTER_READ'].includes(source)) {
    const existing = await prisma.xpEvent.findFirst({
      where: {
        userId,
        source,
        meta: { path: ['contentId'], equals: meta.contentId },
      },
    });
    if (existing) return { granted: false, amount: 0, totalXp: -1 };
  }

  // Idempotency: streak milestones — once per streakDay value
  if (source === 'STREAK_7_DAY' || source === 'STREAK_30_DAY') {
    const existing = await prisma.xpEvent.findFirst({
      where: {
        userId,
        source,
        meta: { path: ['streakDay'], equals: meta.streakDay },
      },
    });
    if (existing) return { granted: false, amount: 0, totalXp: -1 };
  }

  // Write event + increment totalXp atomically
  const [, updated] = await prisma.$transaction([
    prisma.xpEvent.create({
      data: { userId, source, amount, meta },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { totalXp: { increment: amount } },
      select: { totalXp: true },
    }),
  ]);

  return { granted: true, amount, totalXp: updated.totalXp };
}

// ---------------------------------------------------------------------------
// checkStreakMilestones — call after every reading progress update
// ---------------------------------------------------------------------------
export async function checkStreakMilestones(userId: string, streakDays: number) {
  if (streakDays >= 30 && streakDays % 30 === 0) {
    await grantXp(userId, 'STREAK_30_DAY', { streakDay: streakDays });
  } else if (streakDays >= 7 && streakDays % 7 === 0) {
    await grantXp(userId, 'STREAK_7_DAY', { streakDay: streakDays });
  }
}

// ---------------------------------------------------------------------------
// getXpSummary — full XP + rank summary for a user
// ---------------------------------------------------------------------------
export async function getXpSummary(userId: string) {
  const [user, ranks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalXp: true } }),
    getRanks(),
  ]);

  const totalXp = user?.totalXp ?? 0;
  const { rank, nextRank, xpIntoLevel, xpNeeded, progressPct } = computeRank(totalXp, ranks);

  return { totalXp, rank, nextRank, xpIntoLevel, xpNeeded, progressPct };
}

// ---------------------------------------------------------------------------
// DEFAULT RANKS — used to seed the DB on first boot
// ---------------------------------------------------------------------------
export const DEFAULT_RANKS = [
  { level: 1,  title: 'Wandering Scribe',      xpRequired:      0, icon: 'Feather',    colorClass: 'text-stone-400',    description: 'Your archive journey begins.' },
  { level: 2,  title: 'Ink-Stained Apprentice', xpRequired:    500, icon: 'BookOpen',   colorClass: 'text-amber-500',    description: 'The ink is starting to flow.' },
  { level: 3,  title: 'Keeper of Pages',        xpRequired:   1200, icon: 'Book',       colorClass: 'text-lime-600',     description: 'Pages are your currency.' },
  { level: 4,  title: 'Lore Seeker',            xpRequired:   2500, icon: 'Search',     colorClass: 'text-cyan-500',     description: 'Driven by insatiable curiosity.' },
  { level: 5,  title: 'Chronicle Warden',       xpRequired:   4500, icon: 'Shield',     colorClass: 'text-blue-500',     description: 'Guardian of accumulated knowledge.' },
  { level: 6,  title: 'Tome Whisperer',         xpRequired:   7500, icon: 'Scroll',     colorClass: 'text-violet-500',   description: 'The tomes speak to you.' },
  { level: 7,  title: 'Archivist of Shadows',   xpRequired:  12000, icon: 'Moon',       colorClass: 'text-purple-500',   description: 'Keeper of forbidden and forgotten lore.' },
  { level: 8,  title: 'Codex Sage',             xpRequired:  18500, icon: 'Sparkles',   colorClass: 'text-rose-500',     description: 'Ancient wisdom flows through you.' },
  { level: 9,  title: 'Grand Illuminator',      xpRequired:  27000, icon: 'Sun',        colorClass: 'text-orange-400',   description: 'Your knowledge illuminates the archive.' },
  { level: 10, title: 'Eternal Archivist',      xpRequired:  40000, icon: 'Crown',      colorClass: 'text-yellow-400',   description: 'The pinnacle. The archive is yours.' },
] as const;

export async function seedDefaultRanks(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;
  for (const rank of DEFAULT_RANKS) {
    const existing = await prisma.rankDefinition.findUnique({ where: { level: rank.level } });
    if (existing) { skipped++; continue; }
    await prisma.rankDefinition.create({ data: { ...rank } });
    seeded++;
  }
  return { seeded, skipped };
}
