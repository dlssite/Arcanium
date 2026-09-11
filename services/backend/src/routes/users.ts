import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMe, updateMe, submitCreatorApplication } from '../services/users.service.js';

export const usersRouter: Router = Router();

// All user routes require a valid JWT
usersRouter.use(authenticate);

usersRouter.get('/me', getMe);
usersRouter.patch('/me', updateMe);

/** POST /api/v1/users/creator-application — submit a verified-writer application */
usersRouter.post('/creator-application', submitCreatorApplication);
