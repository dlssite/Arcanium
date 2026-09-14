import { z } from 'zod';

// ---------------------------------------------------------------------------
// Rank Definition — mirrors the Prisma RankDefinition model
// ---------------------------------------------------------------------------

export const RankDefinitionSchema = z.object({
  id:          z.string(),
  level:       z.number().int(),
  title:       z.string(),
  xpRequired:  z.number().int(),
  icon:        z.string(),
  colorClass:  z.string(),
  description: z.string().nullable().optional(),
});

export type RankDefinition = z.infer<typeof RankDefinitionSchema>;

// ---------------------------------------------------------------------------
// Admin shape — includes enabled + timestamps
// ---------------------------------------------------------------------------

export const AdminRankDefinitionSchema = RankDefinitionSchema.extend({
  enabled:   z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminRankDefinition = z.infer<typeof AdminRankDefinitionSchema>;

export interface AdminRankInput {
  level:       number;
  title:       string;
  xpRequired:  number;
  icon?:       string;
  colorClass?: string;
  description?: string;
  enabled?:    boolean;
}

// ---------------------------------------------------------------------------
// XP summary — returned inside UserProfile.xp
// ---------------------------------------------------------------------------

export const XpSummarySchema = z.object({
  total:       z.number().int(),
  rank:        RankDefinitionSchema.nullable(),
  nextRank:    RankDefinitionSchema.nullable(),
  xpIntoLevel: z.number().int(),
  xpNeeded:    z.number().int(),
  progressPct: z.number().int().min(0).max(100),
});

export type XpSummary = z.infer<typeof XpSummarySchema>;

// ---------------------------------------------------------------------------
// XpConfig — map of XP source key → amount (stored in AppConfig)
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
export type XpConfig = Record<XpSource, number>;
