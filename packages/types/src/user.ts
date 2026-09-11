import { z } from 'zod';

// ---------------------------------------------------------------------------
// User — mirrors the Prisma User model
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum([
  'USER',
  'VERIFIED_WRITER',
  'MODERATOR',
  'ADMIN',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CreatorApplicationStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]).nullable();
export type CreatorApplicationStatus = z.infer<typeof CreatorApplicationStatusSchema>;

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable(),
  googleId: z.string().nullable(),
  /** 1–5, computed from reading activity */
  archiveLevel: z.number().int().min(1).max(5).default(1),
  /** User's platform role — drives access to creator tools */
  role: UserRoleSchema.default('USER'),
  /** Status of user's most recent creator application, if any */
  creatorApplicationStatus: CreatorApplicationStatusSchema.optional(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// ---------------------------------------------------------------------------
// Reading stats — derived server-side, returned with UserProfile
// ---------------------------------------------------------------------------

export const ReadingStatsSchema = z.object({
  manuscriptsRead: z.number().int().default(0),
  totalHoursLogged: z.number().default(0),
  archiveRank: z.string().default('Apprentice'),
  readingStreak: z.number().int().default(0),
});

export type ReadingStats = z.infer<typeof ReadingStatsSchema>;

// ---------------------------------------------------------------------------
// User badge — milestone achievement
// ---------------------------------------------------------------------------

export const UserBadgeSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  iconName: z.string(),
  unlocked: z.boolean(),
  tier: z.string(),
  colorClasses: z.string(),
});

export type UserBadge = z.infer<typeof UserBadgeSchema>;

// ---------------------------------------------------------------------------
// Shelf summary — default shelf descriptor included in UserProfile
// ---------------------------------------------------------------------------

export const ShelfSummarySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  sortOrder: z.number().int(),
});

export type ShelfSummary = z.infer<typeof ShelfSummarySchema>;

// ---------------------------------------------------------------------------
// UserProfile — what GET /api/v1/users/me returns
// ---------------------------------------------------------------------------

export const UserProfileSchema = UserSchema.extend({
  shelves: z.array(ShelfSummarySchema),
  stats: ReadingStatsSchema,
  badges: z.array(UserBadgeSchema),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ---------------------------------------------------------------------------
// Update profile DTO
// ---------------------------------------------------------------------------

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
