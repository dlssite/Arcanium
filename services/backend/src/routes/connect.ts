import { Router } from 'express';
import { getPublicConnectCards } from '../services/content.service.js';

export const connectRouter: Router = Router();

// Public — no auth required
/** GET /api/v1/connect — returns enabled connect cards */
connectRouter.get('/', getPublicConnectCards);
