import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { User } from '@prisma/client';
import { grantXp } from './xp.service.js';

/**
 * Review Service
 * Handles all review and rating operations: CRUD, aggregation, echo reactions.
 * Maintains denormalized Content.averageRating, ratingCount, reviewCount.
 */

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Recalculate and update content aggregate rating fields.
 * Called after every review create/update/delete.
 */
async function updateContentAggregates(contentId: string): Promise<void> {
  const aggregates = await prisma.review.aggregate({
    where: { contentId },
    _count: true,
    _avg: { rating: true },
  });

  const reviewsWithText = await prisma.review.count({
    where: { contentId, reviewText: { not: null } },
  });

  await prisma.content.update({
    where: { id: contentId },
    data: {
      averageRating: aggregates._avg.rating ?? null,
      ratingCount: aggregates._count,
      reviewCount: reviewsWithText,
    },
  });
}

/**
 * Serialize a review with user info and optional echo state.
 */
function serializeReview(review: any, userHasEchoed?: boolean) {
  return {
    id: review.id,
    contentId: review.contentId,
    userId: review.userId,
    userDisplayName: review.user?.displayName,
    userAvatarUrl: review.user?.avatarUrl,
    rating: review.rating,
    reviewText: review.reviewText,
    echoCount: review.echoCount,
    hasEchoed: userHasEchoed ?? false,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// PUBLIC ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/content/:slug/reviews
 * Get reviews for a book with optional sorting and pagination.
 * Public endpoint — no auth required, but returns hasEchoed only if authenticated.
 */
export async function getReviewsForBook(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const { page = 1, limit = 10, sort = 'helpful' } = req.query;

  const pageNum = parseInt(String(page), 10) || 1;
  const limitNum = Math.min(parseInt(String(limit), 10) || 10, 50);
  const skip = (pageNum - 1) * limitNum;

  // Validate sort parameter
  const validSorts = ['helpful', 'recent', 'highest', 'lowest'];
  const sortBy = validSorts.includes(String(sort)) ? String(sort) : 'helpful';

  try {
    // Get content to verify it exists
    const content = await prisma.content.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!content) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      });
      return;
    }

    // Build order clause — must be an array for multi-column sorts
    let orderBy: any[];
    switch (sortBy) {
      case 'helpful':
        orderBy = [{ echoCount: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'recent':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'highest':
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'lowest':
        orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }];
        break;
      default:
        orderBy = [{ echoCount: 'desc' }, { createdAt: 'desc' }];
    }

    // Fetch reviews
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { contentId: content.id },
        include: { user: { select: { displayName: true, avatarUrl: true } } },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where: { contentId: content.id } }),
    ]);

    // If authenticated, check which reviews the user has echoed
    let userEchedReviewIds: Set<string> = new Set();
    const user = (req as any).user;
    if (user) {
      const userEchoes = await prisma.reviewReaction.findMany({
        where: {
          userId: user.id,
          review: { contentId: content.id },
        },
        select: { reviewId: true },
      });
      userEchedReviewIds = new Set(userEchoes.map((e) => e.reviewId));
    }

    // Get aggregate stats
    const aggregates = await prisma.review.aggregate({
      where: { contentId: content.id },
      _count: true,
      _avg: { rating: true },
    });

    const reviewsWithText = await prisma.review.count({
      where: { contentId: content.id, reviewText: { not: null } },
    });

    // Calculate rating distribution
    const ratingGroups = await prisma.review.groupBy({
      by: ['rating'],
      where: { contentId: content.id },
      _count: true,
    });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingGroups.forEach((group) => {
      distribution[group.rating as 1 | 2 | 3 | 4 | 5] = group._count;
    });

    // Get user's own review if authenticated
    let userReview = null;
    if (user) {
      const ownReview = await prisma.review.findUnique({
        where: { contentId_userId: { contentId: content.id, userId: user.id } },
      });
      if (ownReview) {
        userReview = serializeReview(ownReview);
      }
    }

    res.json({
      data: {
        reviews: reviews.map((r) => serializeReview(r, userEchedReviewIds.has(r.id))),
        aggregate: {
          averageRating: aggregates._avg.rating ?? null,
          ratingCount: aggregates._count,
          reviewCount: reviewsWithText,
          distribution,
        },
        userReview,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          hasMore: skip + reviews.length < total,
        },
      },
      error: null,
    });
  } catch (err) {
    console.error('[Review] getReviewsForBook error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reviews' },
    });
  }
}

/**
 * POST /api/v1/content/:slug/reviews
 * Create or update user's review for a book.
 * Authenticated endpoint.
 */
export async function createOrUpdateReview(req: Request, res: Response): Promise<void> {
  const user = (req as any).user as User;
  const { slug } = req.params as { slug: string };
  const { rating, reviewText } = req.body;

  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Rating must be an integer between 1 and 5' },
    });
    return;
  }

  // Validate reviewText if provided
  const trimmedText = reviewText?.trim() ?? '';
  if (trimmedText && (trimmedText.length < 50 || trimmedText.length > 2000)) {
    res.status(422).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Review text must be between 50 and 2000 characters',
      },
    });
    return;
  }

  try {
    // Get content
    const content = await prisma.content.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!content) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      });
      return;
    }

    // Upsert review (create or update)
    const review = await prisma.review.upsert({
      where: { contentId_userId: { contentId: content.id, userId: user.id } },
      create: {
        contentId: content.id,
        userId: user.id,
        rating,
        reviewText: trimmedText || null,
      },
      update: {
        rating,
        reviewText: trimmedText || null,
        updatedAt: new Date(),
      },
    });

    // Recalculate content aggregates
    await updateContentAggregates(content.id);

    // Grant XP for writing a review (once per book per user)
    grantXp(user.id, 'REVIEW_SUBMIT', { contentId: content.id }).catch(() => {});

    res.json({
      data: serializeReview(review),
      error: null,
    });
  } catch (err) {
    console.error('[Review] createOrUpdateReview error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save review' },
    });
  }
}

/**
 * DELETE /api/v1/content/:slug/reviews
 * Delete user's own review for a book.
 * Authenticated endpoint.
 */
export async function deleteReview(req: Request, res: Response): Promise<void> {
  const user = (req as any).user as User;
  const { slug } = req.params as { slug: string };

  try {
    // Get content
    const content = await prisma.content.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!content) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      });
      return;
    }

    // Find and delete user's review
    const review = await prisma.review.findUnique({
      where: { contentId_userId: { contentId: content.id, userId: user.id } },
    });

    if (!review) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
      return;
    }

    // Delete review (cascades to echoes)
    await prisma.review.delete({
      where: { id: review.id },
    });

    // Recalculate content aggregates
    await updateContentAggregates(content.id);

    res.json({
      data: { deleted: true, reviewId: review.id },
      error: null,
    });
  } catch (err) {
    console.error('[Review] deleteReview error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete review' },
    });
  }
}

// ---------------------------------------------------------------------------
// ECHO / REACTION ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/reviews/:reviewId/echo
 * Toggle echo (like/helpful) on a review.
 * Authenticated endpoint.
 */
export async function toggleEcho(req: Request, res: Response): Promise<void> {
  const user = (req as any).user as User;
  const { reviewId } = req.params as { reviewId: string };

  try {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
      return;
    }

    // Check if user has already echoed
    const existingEcho = await prisma.reviewReaction.findUnique({
      where: { reviewId_userId: { reviewId, userId: user.id } },
    });

    let echoed = false;

    if (existingEcho) {
      // Delete existing echo
      await prisma.reviewReaction.delete({
        where: { id: existingEcho.id },
      });
      // Decrement echo count
      await prisma.review.update({
        where: { id: reviewId },
        data: { echoCount: { decrement: 1 } },
      });
    } else {
      // Create new echo
      await prisma.reviewReaction.create({
        data: { reviewId, userId: user.id },
      });
      // Increment echo count
      await prisma.review.update({
        where: { id: reviewId },
        data: { echoCount: { increment: 1 } },
      });
      echoed = true;
    }

    // Get updated review
    const updatedReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    res.json({
      data: {
        echoed,
        reviewId,
        echoCount: updatedReview?.echoCount ?? 0,
      },
      error: null,
    });
  } catch (err) {
    console.error('[Review] toggleEcho error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle echo' },
    });
  }
}

// ---------------------------------------------------------------------------
// ADMIN ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/admin/reviews
 * List all reviews with filters and search.
 * Admin/Moderator only.
 */
export async function getReviewsAdmin(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 50, rating, contentId, search, sort = 'recent' } = req.query;

  const pageNum = parseInt(String(page), 10) || 1;
  const limitNum = Math.min(parseInt(String(limit), 10) || 50, 100);
  const skip = (pageNum - 1) * limitNum;

  try {
    // Build where clause
    const where: any = {};

    if (rating) {
      const r = parseInt(String(rating), 10);
      if (r >= 1 && r <= 5) {
        where.rating = r;
      }
    }

    if (contentId) {
      where.contentId = contentId;
    }

    if (search) {
      where.reviewText = { contains: String(search), mode: 'insensitive' };
    }

    // Build order clause
    const orderBy: any = {};
    const validSorts = ['recent', 'highest', 'lowest', 'most_echoed'];
    const sortBy = validSorts.includes(String(sort)) ? String(sort) : 'recent';

    switch (sortBy) {
      case 'recent':
        orderBy.createdAt = 'desc';
        break;
      case 'highest':
        orderBy.rating = 'desc';
        break;
      case 'lowest':
        orderBy.rating = 'asc';
        break;
      case 'most_echoed':
        orderBy.echoCount = 'desc';
        break;
    }

    // Fetch reviews with related data
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          content: { select: { id: true, title: true, slug: true, type: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      data: {
        reviews: reviews.map((r) => ({
          id: r.id,
          contentId: r.contentId,
          contentTitle: r.content.title,
          contentSlug: r.content.slug,
          contentType: r.content.type,
          userId: r.userId,
          userDisplayName: r.user.displayName,
          userEmail: r.user.email,
          rating: r.rating,
          reviewText: r.reviewText,
          echoCount: r.echoCount,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: skip + reviews.length < total,
      },
      error: null,
    });
  } catch (err) {
    console.error('[Review] getReviewsAdmin error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reviews' },
    });
  }
}

/**
 * DELETE /api/v1/admin/reviews/:reviewId
 * Delete a review (admin only).
 * Admin/Moderator only.
 */
export async function deleteReviewAdmin(req: Request, res: Response): Promise<void> {
  const { reviewId } = req.params as { reviewId: string };

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, contentId: true },
    });

    if (!review) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
      return;
    }

    // Delete review (cascades to echoes)
    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Recalculate content aggregates
    await updateContentAggregates(review.contentId);

    res.json({
      data: { deleted: true, reviewId },
      error: null,
    });
  } catch (err) {
    console.error('[Review] deleteReviewAdmin error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete review' },
    });
  }
}

/**
 * GET /api/v1/admin/reviews/analytics
 * Get review analytics and statistics.
 * Admin/Moderator only.
 */
export async function getReviewAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const [
      totalReviews,
      avgRating,
      reviews7days,
      reviews30days,
      ratingDist,
      topRatedBooks,
      mostReviewedBooks,
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.review.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.review.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        _count: true,
      }),
      prisma.content.findMany({
        where: { ratingCount: { gt: 0 } },
        select: {
          id: true,
          title: true,
          slug: true,
          averageRating: true,
          ratingCount: true,
        },
        orderBy: { averageRating: 'desc' },
        take: 5,
      }),
      prisma.content.findMany({
        where: { reviewCount: { gt: 0 } },
        select: {
          id: true,
          title: true,
          slug: true,
          reviewCount: true,
          averageRating: true,
        },
        orderBy: { reviewCount: 'desc' },
        take: 5,
      }),
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingDist.forEach((group) => {
      distribution[group.rating as 1 | 2 | 3 | 4 | 5] = group._count;
    });

    res.json({
      data: {
        totalReviews,
        avgRatingGlobal: avgRating._avg.rating ?? null,
        reviewsLast7Days: reviews7days,
        reviewsLast30Days: reviews30days,
        ratingDistribution: distribution,
        topRatedBooks: topRatedBooks.map((b) => ({
          contentId: b.id,
          title: b.title,
          slug: b.slug,
          averageRating: b.averageRating,
          ratingCount: b.ratingCount,
        })),
        mostReviewedBooks: mostReviewedBooks.map((b) => ({
          contentId: b.id,
          title: b.title,
          slug: b.slug,
          reviewCount: b.reviewCount,
          averageRating: b.averageRating,
        })),
      },
      error: null,
    });
  } catch (err) {
    console.error('[Review] getReviewAnalytics error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' },
    });
  }
}
