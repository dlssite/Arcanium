import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMe, updateMe, submitCreatorApplication, getDefaultAvatars, getPublicRanks } from '../services/users.service.js';

export const usersRouter: Router = Router();

// Public route — no auth required
/** GET /api/v1/users/default-avatars — enabled default avatar list */
usersRouter.get('/default-avatars', getDefaultAvatars);

/** GET /api/v1/users/ranks — enabled ranks ordered by level */
usersRouter.get('/ranks', getPublicRanks);

// All routes below require a valid JWT
usersRouter.use(authenticate);

usersRouter.get('/me', getMe);
usersRouter.patch('/me', updateMe);

/** POST /api/v1/users/creator-application — submit a verified-writer application */
usersRouter.post('/creator-application', submitCreatorApplication);
