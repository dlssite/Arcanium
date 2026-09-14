import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';
import { authRouter }    from './routes/auth.js';
import { usersRouter }   from './routes/users.js';
import { libraryRouter } from './routes/library.js';
import { contentRouter } from './routes/content.js';
import { categoriesRouter } from './routes/categories.js';
import { collectionsRouter } from './routes/collections.js';
import { communityRouter } from './routes/community.js';
import { creatorRouter } from './routes/creator.js';
import { adminRouter }   from './routes/admin.js';
import { reviewsRouter } from './routes/reviews.js';
import { aiRouter }      from './ai/router.js';
import { scraperRouter } from './scraper/scraperRouter.js';
import { initScraperQueue } from './scraper/scraperQueue.js';
import { errorHandler } from './middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

const app: Express = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true, // required for the httpOnly refresh cookie exchange
  }),
);

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many requests — try again later' },
  },
});

// Tighter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts — try again later' },
  },
});

app.use(limiter);
app.use('/api/v1/auth', authLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/v1/auth',    authRouter);
app.use('/api/v1/users',   usersRouter);
app.use('/api/v1/library', libraryRouter);
app.use('/api/v1/content',    contentRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/collections', collectionsRouter);
app.use('/api/v1/community', communityRouter);
app.use('/api/v1/creator', creatorRouter);
app.use('/api/v1/admin',   adminRouter);
app.use('/api/v1/admin/content', scraperRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/ai',      aiRouter);

// ── Health check ─────────────────────────────────────────────────────────────
// Used by Docker, Render, and local verification.
// Returns 200 with db status, or 503 if Prisma can't reach the database.
app.get('/api/v1/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok', db: 'connected' }, error: null });
  } catch {
    res.status(503).json({
      data: null,
      error: { code: 'DB_UNAVAILABLE', message: 'Database is unreachable' },
    });
  }
});

// 404 catch-all — must come after all routes
app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Global error handler — must be last
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(env.PORT, () => {
  console.info(`✅ Arcanium backend running on http://localhost:${env.PORT}`);
  console.info(`   Environment : ${env.NODE_ENV}`);
  console.info(`   CORS origins: ${env.CORS_ORIGINS.join(', ')}`);
  // Initialise scraper queue (no-op if REDIS_URL not set)
  void initScraperQueue();
});

export { app };
