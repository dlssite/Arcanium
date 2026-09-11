import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  createContent,
  listCreatorContent,
  updateContent,
  createChapter,
  updateChapter,
  publishChapter,
  deleteChapter,
  listCreatorChapters,
} from '../services/creator.service.js';

export const creatorRouter: Router = Router();

// All creator routes require auth + VERIFIED_WRITER or ADMIN
creatorRouter.use(authenticate);
creatorRouter.use(requireRole('VERIFIED_WRITER', 'ADMIN'));

// Content CRUD
creatorRouter.post('/', createContent);
creatorRouter.get('/', listCreatorContent);
creatorRouter.patch('/:contentId', updateContent);

// Chapter CRUD
creatorRouter.get('/:contentId/chapters', listCreatorChapters);
creatorRouter.post('/:contentId/chapters', createChapter);
creatorRouter.patch('/:contentId/chapters/:chapterId', updateChapter);
creatorRouter.post('/:contentId/chapters/:chapterId/publish', publishChapter);
creatorRouter.delete('/:contentId/chapters/:chapterId', deleteChapter);
