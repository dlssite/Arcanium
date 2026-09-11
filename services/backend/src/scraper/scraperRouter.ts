import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { IngestContentSchema } from '@arcanium/types';
import { ingestContent } from './scraper.service.js';
import { prisma } from '../lib/prisma.js';

export const scraperRouter: Router = Router();

scraperRouter.use(authenticate);
scraperRouter.use(requireRole('ADMIN', 'MODERATOR'));

/**
 * POST /api/v1/admin/content/ingest
 * Body: { url, type, overrideTitle? }
 * Admin/moderator only.
 *
 * Returns immediately with content metadata.
 * Chapter body text is fetched in the background by BullMQ workers
 * (or on-demand when first requested by the reader if Redis is unavailable).
 */
scraperRouter.post('/ingest', async (req, res) => {
  const parsed = IngestContentSchema.safeParse(req.body);
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
    const result = await ingestContent(parsed.data);
    res.status(result.isNew ? 201 : 200).json({ data: result, error: null });
  } catch (err) {
    console.error('[scraper] Ingest failed:', (err as Error).message);
    res.status(502).json({
      data: null,
      error: {
        code: 'INGEST_FAILED',
        message: (err as Error).message ?? 'Failed to ingest content from the provided URL',
      },
    });
  }
});

/**
 * DELETE /api/v1/admin/content/wipe
 * Deletes ALL content, chapters, shelf entries, and reading progress.
 * Used for dev reseeding only. ADMIN role required.
 */
scraperRouter.delete('/wipe', async (_req, res) => {
  try {
    // Delete in dependency order (FK constraints)
    await prisma.aiActionLog.deleteMany({});
    await prisma.readingProgress.deleteMany({});
    await prisma.shelfEntry.deleteMany({});
    await prisma.chapter.deleteMany({});
    const { count } = await prisma.content.deleteMany({});

    console.info(`[admin] Wiped ${count} content records`);
    res.json({ data: { deleted: count, message: 'Catalogue wiped successfully' }, error: null });
  } catch (err) {
    res.status(500).json({
      data: null,
      error: { code: 'WIPE_FAILED', message: (err as Error).message },
    });
  }
});
