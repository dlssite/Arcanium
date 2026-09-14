import { z } from 'zod';

// ---------------------------------------------------------------------------
// Review — User rating and reflection on a book
// ---------------------------------------------------------------------------

/**
 * Individual review object returned in review lists
 * Includes user info for display and echo state if authenticated
 */
export const ReviewSchema = z.object({
  id: z.string().cuid(),
  contentId: z.string().cuid(),
  userId: z.string().cuid(),
  userDisplayName: z.string(),
  userAvatarUrl: z.string().url().nullable(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().nullable(),
  echoCount: z.number().int().min(0).default(0),
  hasEchoed: z.boolean().default(false), // Only set if authenticated
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Review = z.infer<typeof ReviewSchema>;

// ---------------------------------------------------------------------------
// ReviewInput — Request body for creating/updating a review
// ---------------------------------------------------------------------------

export const ReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val === '' || (val.length >= 50 && val.length <= 2000), {
      message: 'Review text must be between 50 and 2000 characters, or empty',
    })
    .optional(),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

// ---------------------------------------------------------------------------
// RatingDistribution — Breakdown of ratings (1-5)
// ---------------------------------------------------------------------------

export const RatingDistributionSchema = z.object({
  '1': z.number().int().min(0),
  '2': z.number().int().min(0),
  '3': z.number().int().min(0),
  '4': z.number().int().min(0),
  '5': z.number().int().min(0),
});

export type RatingDistribution = z.infer<typeof RatingDistributionSchema>;

// ---------------------------------------------------------------------------
// ReviewAggregate — Statistics for a book's reviews
// ---------------------------------------------------------------------------

export const ReviewAggregateSchema = z.object({
  averageRating: z.number().min(1).max(5).nullable(),
  ratingCount: z.number().int().min(0),
  reviewCount: z.number().int().min(0),
  distribution: RatingDistributionSchema,
});

export type ReviewAggregate = z.infer<typeof ReviewAggregateSchema>;

// ---------------------------------------------------------------------------
// PaginationInfo — Pagination metadata for list responses
// ---------------------------------------------------------------------------

export const PaginationInfoSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(50),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;

// ---------------------------------------------------------------------------
// ReviewListResponse — GET /api/v1/content/:slug/reviews
// ---------------------------------------------------------------------------

export const ReviewListResponseSchema = z.object({
  reviews: z.array(ReviewSchema),
  aggregate: ReviewAggregateSchema,
  userReview: ReviewSchema.nullable(),
  pagination: PaginationInfoSchema,
});

export type ReviewListResponse = z.infer<typeof ReviewListResponseSchema>;

// ---------------------------------------------------------------------------
// ReviewCreateResponse — POST /api/v1/content/:slug/reviews
// ---------------------------------------------------------------------------

export const ReviewCreateResponseSchema = ReviewSchema;

export type ReviewCreateResponse = z.infer<typeof ReviewCreateResponseSchema>;

// ---------------------------------------------------------------------------
// ReviewDeleteResponse — DELETE /api/v1/content/:slug/reviews
// ---------------------------------------------------------------------------

export const ReviewDeleteResponseSchema = z.object({
  deleted: z.boolean(),
  reviewId: z.string().cuid(),
});

export type ReviewDeleteResponse = z.infer<typeof ReviewDeleteResponseSchema>;

// ---------------------------------------------------------------------------
// EchoToggleResponse — POST /api/v1/reviews/:reviewId/echo
// ---------------------------------------------------------------------------

export const EchoToggleResponseSchema = z.object({
  echoed: z.boolean(),
  reviewId: z.string().cuid(),
  echoCount: z.number().int().min(0),
});

export type EchoToggleResponse = z.infer<typeof EchoToggleResponseSchema>;

// ---------------------------------------------------------------------------
// Admin Review — Full review details for admin panel
// ---------------------------------------------------------------------------

export const AdminReviewSchema = z.object({
  id: z.string().cuid(),
  contentId: z.string().cuid(),
  contentTitle: z.string(),
  contentSlug: z.string(),
  contentType: z.string(),
  userId: z.string().cuid(),
  userDisplayName: z.string(),
  userEmail: z.string().email(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().nullable(),
  echoCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});

export type AdminReview = z.infer<typeof AdminReviewSchema>;

// ---------------------------------------------------------------------------
// AdminReviewsListResponse — GET /api/v1/admin/reviews
// ---------------------------------------------------------------------------

export const AdminReviewsListResponseSchema = z.object({
  reviews: z.array(AdminReviewSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  hasMore: z.boolean(),
});

export type AdminReviewsListResponse = z.infer<typeof AdminReviewsListResponseSchema>;

// ---------------------------------------------------------------------------
// AdminReviewAnalytics — Review statistics for dashboard
// ---------------------------------------------------------------------------

export const AdminReviewAnalyticsSchema = z.object({
  totalReviews: z.number().int().min(0),
  avgRatingGlobal: z.number().min(1).max(5).nullable(),
  reviewsLast7Days: z.number().int().min(0),
  reviewsLast30Days: z.number().int().min(0),
  ratingDistribution: RatingDistributionSchema,
  topRatedBooks: z.array(
    z.object({
      contentId: z.string().cuid(),
      title: z.string(),
      slug: z.string(),
      averageRating: z.number().min(1).max(5),
      ratingCount: z.number().int().min(0),
    }),
  ),
  mostReviewedBooks: z.array(
    z.object({
      contentId: z.string().cuid(),
      title: z.string(),
      slug: z.string(),
      reviewCount: z.number().int().min(0),
      averageRating: z.number().min(1).max(5).nullable(),
    }),
  ),
});

export type AdminReviewAnalytics = z.infer<typeof AdminReviewAnalyticsSchema>;

// ---------------------------------------------------------------------------
// Query Parameters
// ---------------------------------------------------------------------------

/**
 * Query params for GET /api/v1/content/:slug/reviews
 */
export const ReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['helpful', 'recent', 'highest', 'lowest']).default('helpful'),
});

export type ReviewQuery = z.infer<typeof ReviewQuerySchema>;

/**
 * Query params for GET /api/v1/admin/reviews
 */
export const AdminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  contentId: z.string().cuid().optional(),
  search: z.string().optional(),
  sort: z
    .enum(['recent', 'highest', 'lowest', 'most_echoed'])
    .default('recent'),
});

export type AdminReviewQuery = z.infer<typeof AdminReviewQuerySchema>;
