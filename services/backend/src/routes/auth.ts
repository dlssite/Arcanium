import { Router } from 'express';
import {
  googleRedirect,
  googleCallback,
  register,
  login,
  refresh,
  logout,
} from '../services/auth.service.js';

export const authRouter: Router = Router();

// Google OAuth flow
authRouter.get('/google', googleRedirect);
authRouter.get('/google/callback', googleCallback);

// Email / password
authRouter.post('/register', register);
authRouter.post('/login', login);

// Token lifecycle
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
