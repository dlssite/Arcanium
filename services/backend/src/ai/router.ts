import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate.js';
import { featureFlag } from '../middleware/featureFlag.js';
import { chat } from './housekeeper.service.js';

export const aiRouter: Router = Router();

// Tighter rate limit for AI endpoints — cost control is a security concern
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 20,               // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many AI requests — please wait a moment.' },
  },
});

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(20)   // cap history depth to control token usage
    .default([]),
});

aiRouter.post(
  '/chat',
  authenticate,
  featureFlag('AI_HOUSEKEEPER'),
  aiRateLimit,
  async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join('; '),
        },
      });
      return;
    }

    try {
      const response = await chat({
        userId: req.user.id,
        message: parsed.data.message,
        conversationHistory: parsed.data.conversationHistory,
      });

      res.json({ data: response, error: null });
    } catch (err) {
      console.error('[ai/chat] error:', err);
      res.status(503).json({
        data: null,
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'AI service is temporarily unavailable. Please try again.',
        },
      });
    }
  },
);
