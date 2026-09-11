import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getLibrary,
  addToShelf,
  removeFromShelf,
  upsertProgress,
} from '../services/library.service.js';

export const libraryRouter: Router = Router();

// All library routes require authentication
libraryRouter.use(authenticate);

libraryRouter.get('/', getLibrary);
libraryRouter.post('/shelves/:shelfId/entries', addToShelf);
libraryRouter.delete('/shelves/:shelfId/entries/:contentId', removeFromShelf);
libraryRouter.put('/progress/:contentId', upsertProgress);
