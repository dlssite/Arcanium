import { Router } from 'express';
import { listCategories } from '../services/admin.service.js';

export const categoriesRouter: Router = Router();

/** GET /api/v1/categories — public, no auth, returns enabled categories */
categoriesRouter.get('/', listCategories);
