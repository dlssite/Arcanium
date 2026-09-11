import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getCommunityOverview, echoPost } from '../services/community.service.js';

export const communityRouter: Router = Router();

// All community routes require authentication
communityRouter.use(authenticate);

communityRouter.get('/overview', getCommunityOverview);
communityRouter.post('/echo/:postId', echoPost);
