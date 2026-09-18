import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getReviewsForBook,
  createOrUpdateReview,
  deleteReview,
  toggleEcho,
} from '../services/review.service.js';

export const reviewsRouter: Router = Router();

// ---------------------------------------------------------------------------
// PUBLIC ROUTES — /api/v1/content/:slug/reviews
// Mounted at contentRouter with path prefix
// ---------------------------------------------------------------------------

export const contentReviewsRouter: Router = Router({ mergeParams: true });

// GET — list reviews for a book (optional auth for echo state)
contentReviewsRouter.get('/', getReviewsForBook);

// POST — create/update user's review (authenticated)
contentReviewsRouter.post('/', authenticate, createOrUpdateReview);

// DELETE — delete user's own review (authenticated)
contentReviewsRouter.delete('/', authenticate, deleteReview);

// ---------------------------------------------------------------------------
// ECHO / REACTION ROUTES — /api/v1/reviews/:reviewId/echo
// ---------------------------------------------------------------------------

reviewsRouter.post('/:reviewId/echo', authenticate, toggleEcho);
