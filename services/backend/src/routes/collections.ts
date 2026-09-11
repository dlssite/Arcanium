import { Router } from 'express';
import { listCollections, getCollection } from '../services/collections.service.js';

export const collectionsRouter: Router = Router();

// Public — no auth required
collectionsRouter.get('/', listCollections);
collectionsRouter.get('/:slug', getCollection);
