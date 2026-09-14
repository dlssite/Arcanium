import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { listContent, getContent, getChapter, getFeaturedSections } from '../services/content.service.js';
import { contentReviewsRouter } from './reviews.js';

export const contentRouter: Router = Router();

// Catalogue routes — public, no auth needed
contentRouter.get('/featured', getFeaturedSections);   // must be before /:slug
contentRouter.get('/', listContent);
contentRouter.get('/:slug', getContent);

// Chapter body — requires auth (reading is a logged-in feature)
contentRouter.get('/:slug/chapters/:number', authenticate, getChapter);

// Reviews for a book
contentRouter.use('/:slug/reviews', contentReviewsRouter);
