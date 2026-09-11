import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reading Circle
// ---------------------------------------------------------------------------

export const ReadingCircleSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  tag: z.string(),
  focusTitle: z.string().nullable(),
  memberCount: z.number().int(),
  activeNow: z.number().int(),
});

export type ReadingCircle = z.infer<typeof ReadingCircleSchema>;

// ---------------------------------------------------------------------------
// Marginalia Post
// ---------------------------------------------------------------------------

export const MarginaliaPostSchema = z.object({
  id: z.string().cuid(),
  author: z.string(),
  authorId: z.string(),
  role: z.string(),           // computed from archiveLevel
  avatarUrl: z.string().nullable(),
  time: z.string(),           // relative time string, e.g. "25m ago"
  book: z.string(),
  chapter: z.string().nullable(),
  quote: z.string(),
  reflection: z.string(),
  echoCount: z.number().int(),
  replyCount: z.number().int(),
});

export type MarginaliaPost = z.infer<typeof MarginaliaPostSchema>;

// ---------------------------------------------------------------------------
// Community Challenge
// ---------------------------------------------------------------------------

export const CommunityChallengeSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  description: z.string(),
  targetPages: z.number().int(),
  completedPages: z.number().int(),
  progressPercent: z.number().int(),
  badgeReward: z.string(),
  totalScholars: z.number().int(),
  endsAt: z.string().datetime(),
});

export type CommunityChallenge = z.infer<typeof CommunityChallengeSchema>;

// ---------------------------------------------------------------------------
// Combined response — GET /api/v1/community/overview
// ---------------------------------------------------------------------------

export const CommunityOverviewSchema = z.object({
  circles: z.array(ReadingCircleSchema),
  posts: z.array(MarginaliaPostSchema),
  challenge: CommunityChallengeSchema.nullable(),
});

export type CommunityOverview = z.infer<typeof CommunityOverviewSchema>;

// ---------------------------------------------------------------------------
// Echo response — POST /api/v1/community/echo/:postId
// ---------------------------------------------------------------------------

export const EchoResponseSchema = z.object({
  postId: z.string(),
  echoCount: z.number().int(),
});

export type EchoResponse = z.infer<typeof EchoResponseSchema>;
