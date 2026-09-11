/**
 * Scraper service — Pipeline A ingestion logic.
 *
 * POST /api/v1/admin/content/ingest calls ingestContent().
 * Flow:
 *   1. Detect parser from URL
 *   2. Extract metadata → upsert Content record
 *   3. Extract chapter list → upsert Chapter records (no bodyText yet)
 *   4. Enqueue background jobs to fetch bodyText for each chapter
 *   5. Return immediately with the content record
 */

import { prisma } from '../lib/prisma.js';
import { getProvider as getParser } from './parsers/index.js';
import type { ChapterRef } from './parsers/index.js';
import { enqueueChapterFetch } from './scraperQueue.js';
import type { IngestContentInput } from '@arcanium/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: slugify } = require('slugify') as typeof import('slugify');

export interface IngestResult {
  contentId: string;
  slug: string;
  title: string;
  isNew: boolean;
  chaptersFound: number;
  chaptersQueued: number;
}

export async function ingestContent(input: IngestContentInput): Promise<IngestResult> {
  const { url, type, overrideTitle } = input;
  const parser = getParser(url);

  // 1. Extract metadata from source URL
  const meta = await parser.extractMetadata(url);

  // 2. Generate a URL-safe slug from the title
  const titleForSlug = overrideTitle ?? meta.title;
  const baseSlug = slugify(titleForSlug, { lower: true, strict: true, trim: true });

  // Make slug unique if it already exists (append -2, -3, etc.)
  let slug = baseSlug;
  let attempt = 2;
  while (await prisma.content.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${attempt++}`;
  }

  // 3. Upsert Content record
  const existing = await prisma.content.findFirst({
    where: { sourceUrl: url },
    select: { id: true, slug: true },
  });

  const content = await prisma.content.upsert({
    where: { slug: existing?.slug ?? slug },
    update: {
      title: overrideTitle ?? meta.title,
      author: meta.author,
      artist: meta.artist,
      synopsis: meta.synopsis,
      coverImageUrl: meta.coverImageUrl,
      sourceSite: meta.sourceSite,
      sourceUrl: url,
      status: meta.status,
      source: 'SCRAPED',
      metadata: {
        genres: meta.genres,
        tags: meta.tags,
      },
    },
    create: {
      slug,
      type: type ?? meta.type,
      title: overrideTitle ?? meta.title,
      author: meta.author,
      artist: meta.artist,
      synopsis: meta.synopsis,
      coverImageUrl: meta.coverImageUrl,
      sourceSite: meta.sourceSite,
      sourceUrl: url,
      status: meta.status,
      source: 'SCRAPED',
      metadata: {
        genres: meta.genres,
        tags: meta.tags,
      },
    },
  });

  const isNew = !existing;

  // 4. Extract chapter list — cap at 200 on first ingest to keep response fast
  // The full list can be re-synced later via a background job
  const MAX_INITIAL_CHAPTERS = 200;
  const allChapterRefs = await parser.extractChapterList(url);
  const chapterRefs = allChapterRefs.slice(0, MAX_INITIAL_CHAPTERS);

  // 5. Upsert all chapters in parallel batches of 10 (remote DB is latency-sensitive)
  const BATCH_SIZE = 10;
  const upsertedChapters: Array<{ id: string; sourceUrl: string | null }> = [];

  for (let i = 0; i < chapterRefs.length; i += BATCH_SIZE) {
    const batch = chapterRefs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((ref: ChapterRef) =>
        prisma.chapter.upsert({
          where: {
            contentId_number: { contentId: content.id, number: ref.number },
          },
          update: {
            title: ref.title,
            publishedAt: ref.publishedAt,
            sourceUrl: ref.url,
          },
          create: {
            contentId: content.id,
            number: ref.number,
            title: ref.title,
            sourceUrl: ref.url,
            publishedAt: ref.publishedAt,
            isPublished: true,
            isDraft: false,
          },
          select: { id: true, sourceUrl: true },
        }),
      ),
    );
    upsertedChapters.push(...results);
  }

  // 6. Update chapter count on content
  await prisma.content.update({
    where: { id: content.id },
    data: { chapterCount: upsertedChapters.length },
  });

  // 7. Enqueue background body-fetch jobs (no-op if Redis not available)
  await enqueueChapterFetch(content.id, upsertedChapters);

  return {
    contentId: content.id,
    slug: content.slug,
    title: content.title,
    isNew,
    chaptersFound: chapterRefs.length,
    chaptersQueued: upsertedChapters.filter((c) => c.sourceUrl).length,
  };
}
