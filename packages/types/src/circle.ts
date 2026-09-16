import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const CircleVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export type CircleVisibility = z.infer<typeof CircleVisibilitySchema>;

export const CircleMemberRoleSchema = z.enum(['OWNER', 'MODERATOR', 'MEMBER']);
export type CircleMemberRole = z.infer<typeof CircleMemberRoleSchema>;

export const CircleMemberStatusSchema = z.enum(['ACTIVE', 'PENDING', 'BANNED']);
export type CircleMemberStatus = z.infer<typeof CircleMemberStatusSchema>;

export const CirclePostTypeSchema = z.enum(['MARGINALIA', 'DISCUSSION']);
export type CirclePostType = z.infer<typeof CirclePostTypeSchema>;

export const CircleJoinRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type CircleJoinRequestStatus = z.infer<typeof CircleJoinRequestStatusSchema>;

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export const CircleSessionSchema = z.object({
  id:          z.string().cuid(),
  bookTitle:   z.string().nullable(),
  chapterHint: z.string().nullable(),
  activeNow:   z.number().int(),
  isActive:    z.boolean(),
  startedAt:   z.string().datetime(),
  endedAt:     z.string().datetime().nullable(),
});
export type CircleSession = z.infer<typeof CircleSessionSchema>;

// ---------------------------------------------------------------------------
// Echo toggle response — mirrors EchoToggleResponse on reviews
// ---------------------------------------------------------------------------

export const CircleEchoResponseSchema = z.object({
  postId:    z.string().cuid(),
  echoed:    z.boolean(),
  echoCount: z.number().int(),
});
export type CircleEchoResponse = z.infer<typeof CircleEchoResponseSchema>;

// ---------------------------------------------------------------------------
// Reply
// ---------------------------------------------------------------------------

export const CirclePostReplySchema = z.object({
  id:        z.string().cuid(),
  postId:    z.string().cuid(),
  authorId:  z.string().cuid(),
  author:    z.string(),        // displayName
  avatarUrl: z.string().nullable(),
  body:      z.string(),
  isRemoved: z.boolean(),
  time:      z.string(),        // relative, e.g. "3m ago"
  createdAt: z.string().datetime(),
});
export type CirclePostReply = z.infer<typeof CirclePostReplySchema>;

export const CirclePostReplyListSchema = z.object({
  replies: z.array(CirclePostReplySchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
});
export type CirclePostReplyList = z.infer<typeof CirclePostReplyListSchema>;

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------

export const CirclePostSchema = z.object({
  id:         z.string().cuid(),
  circleId:   z.string().cuid(),
  authorId:   z.string().cuid(),
  author:     z.string(),
  avatarUrl:  z.string().nullable(),
  role:       z.string(),       // e.g. "Lv.4 Lore Seeker"
  time:       z.string(),
  type:       CirclePostTypeSchema,

  // MARGINALIA fields — null on DISCUSSION posts
  quote:      z.string().nullable(),
  chapter:    z.string().nullable(),
  reflection: z.string().nullable(),

  // DISCUSSION fields — null on MARGINALIA posts
  title:      z.string().nullable(),
  body:       z.string().nullable(),

  echoCount:  z.number().int(),
  replyCount: z.number().int(),
  isPinned:   z.boolean(),
  isRemoved:  z.boolean(),
  echoed:     z.boolean(),      // has the requesting user echoed this post?

  createdAt:  z.string().datetime(),

  // First 2 replies included in list responses for preview rendering
  replyPreview: z.array(CirclePostReplySchema).optional(),
});
export type CirclePost = z.infer<typeof CirclePostSchema>;

export const CirclePostListSchema = z.object({
  posts:   z.array(CirclePostSchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
});
export type CirclePostList = z.infer<typeof CirclePostListSchema>;

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

export const CircleMemberSchema = z.object({
  id:          z.string().cuid(),
  userId:      z.string().cuid(),
  displayName: z.string(),
  avatarUrl:   z.string().nullable(),
  role:        CircleMemberRoleSchema,
  status:      CircleMemberStatusSchema,
  joinedAt:    z.string().datetime(),
});
export type CircleMember = z.infer<typeof CircleMemberSchema>;

// ---------------------------------------------------------------------------
// Join Request
// ---------------------------------------------------------------------------

export const CircleJoinRequestSchema = z.object({
  id:          z.string().cuid(),
  circleId:    z.string().cuid(),
  userId:      z.string().cuid(),
  displayName: z.string(),
  avatarUrl:   z.string().nullable(),
  message:     z.string().nullable(),
  status:      CircleJoinRequestStatusSchema,
  createdAt:   z.string().datetime(),
});
export type CircleJoinRequest = z.infer<typeof CircleJoinRequestSchema>;

// ---------------------------------------------------------------------------
// Circle Summary — list item shape
// ---------------------------------------------------------------------------

export const CircleSummarySchema = z.object({
  id:            z.string().cuid(),
  name:          z.string(),
  tag:           z.string(),
  description:   z.string().nullable(),
  coverColor:    z.string(),
  visibility:    CircleVisibilitySchema,
  memberCount:   z.number().int(),
  activeNow:     z.number().int(),
  isFeatured:    z.boolean(),
  featuredOrder: z.number().int(),
  isArchived:    z.boolean(),
  ownerId:       z.string(),
  ownerName:     z.string(),
  activeSession: CircleSessionSchema.nullable(),
  // null = not a member; object = member with role and status
  membership:    z.object({
    role:   CircleMemberRoleSchema,
    status: CircleMemberStatusSchema,
  }).nullable(),
  pendingRequestCount: z.number().int(),
  createdAt:     z.string().datetime(),
});
export type CircleSummary = z.infer<typeof CircleSummarySchema>;

// ---------------------------------------------------------------------------
// Circle Detail — single circle page (posts/members fetched separately)
// ---------------------------------------------------------------------------

export const CircleDetailSchema = CircleSummarySchema;
export type CircleDetail = z.infer<typeof CircleDetailSchema>;

// ---------------------------------------------------------------------------
// Circle List Response
// ---------------------------------------------------------------------------

export const CircleListResponseSchema = z.object({
  circles: z.array(CircleSummarySchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
});
export type CircleListResponse = z.infer<typeof CircleListResponseSchema>;

// ---------------------------------------------------------------------------
// Input / Mutation schemas
// ---------------------------------------------------------------------------

export const CreateCircleSchema = z.object({
  name:        z.string().min(3).max(80),
  tag:         z.string().min(2).max(30),
  description: z.string().max(500).optional(),
  coverColor:  z.string().optional(),
  visibility:  CircleVisibilitySchema.default('PUBLIC'),
});
export type CreateCircleInput = z.infer<typeof CreateCircleSchema>;

export const UpdateCircleSchema = CreateCircleSchema.partial();
export type UpdateCircleInput = z.infer<typeof UpdateCircleSchema>;

export const CreateCirclePostSchema = z.discriminatedUnion('type', [
  z.object({
    type:       z.literal('MARGINALIA'),
    quote:      z.string().min(10).max(1000),
    reflection: z.string().min(10).max(2000),
    chapter:    z.string().max(100).optional(),
  }),
  z.object({
    type:  z.literal('DISCUSSION'),
    title: z.string().min(3).max(200),
    body:  z.string().min(10).max(5000),
  }),
]);
export type CreateCirclePostInput = z.infer<typeof CreateCirclePostSchema>;

export const CreateCircleReplySchema = z.object({
  body: z.string().min(1).max(1000),
});
export type CreateCircleReplyInput = z.infer<typeof CreateCircleReplySchema>;

export const StartSessionSchema = z.object({
  bookTitle:   z.string().max(200).optional(),
  chapterHint: z.string().max(200).optional(),
});
export type StartSessionInput = z.infer<typeof StartSessionSchema>;

// ---------------------------------------------------------------------------
// Admin-only shapes
// ---------------------------------------------------------------------------

export const AdminCreateCircleSchema = CreateCircleSchema.extend({
  ownerId: z.string().cuid(),
});
export type AdminCreateCircleInput = z.infer<typeof AdminCreateCircleSchema>;

export const AdminCircleSummarySchema = CircleSummarySchema.extend({
  postCount: z.number().int(),
});
export type AdminCircleSummary = z.infer<typeof AdminCircleSummarySchema>;

export const AdminCircleDetailSchema = AdminCircleSummarySchema.extend({
  members:  z.array(CircleMemberSchema),
  requests: z.array(CircleJoinRequestSchema),
});
export type AdminCircleDetail = z.infer<typeof AdminCircleDetailSchema>;

export const AdminCircleListResponseSchema = z.object({
  circles: z.array(AdminCircleSummarySchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
});
export type AdminCircleListResponse = z.infer<typeof AdminCircleListResponseSchema>;

export const CircleConfigSchema = z.object({
  minRankLevel: z.number().int().min(1).max(10),
});
export type CircleConfig = z.infer<typeof CircleConfigSchema>;

// ---------------------------------------------------------------------------
// Query param types (used by api-client and hooks)
// ---------------------------------------------------------------------------

export interface CircleListParams {
  page?:       number;
  limit?:      number;
  search?:     string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'ALL';
  [key: string]: string | number | boolean | undefined;
}

export interface CirclePostListParams {
  page?:  number;
  limit?: number;
  type?:  CirclePostType;
  [key: string]: string | number | boolean | undefined;
}

export interface CircleReplyListParams {
  page?:  number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface AdminCircleListParams {
  page?:       number;
  limit?:      number;
  search?:     string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'ALL';
  isFeatured?: boolean;
  isArchived?: boolean;
  [key: string]: string | number | boolean | undefined;
}
