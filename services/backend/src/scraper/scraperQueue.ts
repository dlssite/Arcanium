/**
 * Background job queue for chapter body fetching.
 *
 * Uses BullMQ backed by Redis. If Redis is unavailable the queue is disabled
 * and chapters are fetched synchronously on first reader request instead
 * (graceful fallback — see fetchChapterBodyOnDemand below).
 *
 * L10 FIX: image-type detection now uses provider.isImageType() instead of
 * the fragile `bodyText.trimStart().startsWith('[')` string heuristic.
 * This correctly handles providers that might return a JSON array for
 * non-image types in future, and makes the intent explicit.
 */

import { prisma }       from '../lib/prisma.js';
import { getProvider }  from './parsers/index.js';

// ---------------------------------------------------------------------------
// Queue setup (lazy — only initialised when Redis is available)
// ---------------------------------------------------------------------------

let chapterQueue:  import('bullmq').Queue  | null = null;
let chapterWorker: import('bullmq').Worker | null = null;

export interface ChapterJob {
  contentId:  string;
  chapterId:  string;
  chapterUrl: string;
}

/**
 * Initialise the BullMQ queue if REDIS_URL is configured.
 * Called once at app startup from src/index.ts.
 */
export async function initScraperQueue(): Promise<void> {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    console.info(
      '[scraper] REDIS_URL not set — background chapter queue disabled (sync fallback active)',
    );
    return;
  }

  try {
    const { Queue, Worker }      = await import('bullmq');
    const { default: IORedis }   = await import('ioredis');

    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    chapterQueue = new Queue<ChapterJob>('chapter-fetch', { connection });

    chapterWorker = new Worker<ChapterJob>(
      'chapter-fetch',
      async (job) => {
        await processChapterJob(job.data);
      },
      {
        connection,
        concurrency: 3,
        limiter: { max: 10, duration: 60_000 },
      },
    );

    chapterWorker.on('failed', (job, err) => {
      console.error(`[scraper] Chapter job failed: ${job?.id}`, err.message);
    });

    console.info('[scraper] BullMQ chapter queue initialised');
  } catch (err) {
    console.warn('[scraper] Could not init BullMQ queue:', (err as Error).message);
  }
}

/**
 * Enqueue background fetch jobs for all chapters of a content item.
 * Falls back to no-op if the queue is not available.
 */
export async function enqueueChapterFetch(
  contentId: string,
  chapters: Array<{ id: string; sourceUrl: string | null }>,
): Promise<void> {
  if (!chapterQueue) return;

  const jobs = chapters
    .filter((c) => c.sourceUrl)
    .map((c) => ({
      name: `fetch-chapter-${c.id}`,
      data: { contentId, chapterId: c.id, chapterUrl: c.sourceUrl! },
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    }));

  if (jobs.length > 0) {
    await chapterQueue.addBulk(jobs);
  }
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processChapterJob(job: ChapterJob): Promise<void> {
  const { chapterId, chapterUrl } = job;

  const provider = getProvider(chapterUrl);

  // L10 FIX — use provider.isImageType() instead of bodyText string inspection.
  // Image-type chapters (MangaDex CDN) are never persisted — URLs expire in ~15 min.
  if (provider.isImageType()) return;

  // Check if already fetched to avoid redundant work
  const existing = await prisma.chapter.findUnique({
    where:  { id: chapterId },
    select: { bodyText: true },
  });
  if (existing?.bodyText) return;

  const bodyText  = await provider.extractChapterBody(chapterUrl);
  const wordCount = bodyText
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  await prisma.chapter.update({
    where: { id: chapterId },
    data:  { bodyText, wordCount },
  });
}

// ---------------------------------------------------------------------------
// On-demand fallback (used when queue is unavailable or chapter not yet cached)
// ---------------------------------------------------------------------------

/**
 * Fetch a chapter body synchronously.
 *
 * L10 FIX — isImageType() determines caching behaviour, not string inspection.
 * Image chapters are returned fresh and never written to the DB.
 * Text chapters are persisted so subsequent reads hit the cache.
 */
export async function fetchChapterBodyOnDemand(
  chapterId:  string,
  chapterUrl: string,
): Promise<string | null> {
  try {
    const provider = getProvider(chapterUrl);
    const bodyText = await provider.extractChapterBody(chapterUrl);

    // L10 FIX — isImageType() is the canonical image detection signal
    if (provider.isImageType()) {
      // Do not persist — return fresh CDN URLs directly
      return bodyText;
    }

    // Text content: persist to DB for offline caching
    const wordCount = bodyText
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;

    await prisma.chapter.update({
      where: { id: chapterId },
      data:  { bodyText, wordCount },
    });

    return bodyText;
  } catch (err) {
    console.error(
      `[scraper] On-demand fetch failed for chapter ${chapterId}:`,
      (err as Error).message,
    );
    return null;
  }
}
