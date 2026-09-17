import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { ContentQuerySchema } from '@arcanium/types';

// ---------------------------------------------------------------------------
// GET /api/v1/content
// Paginated catalogue list with optional search and genre/type/status filters.
// Public — no authentication required.
// ---------------------------------------------------------------------------

export async function listContent(req: Request, res: Response): Promise<void> {
  const parsed = ContentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues
          .map((i: { message: string }) => i.message)
          .join('; '),
      },
    });
    return;
  }

  const { q, genre, type, status, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    // Never surface CANCELLED content in the public catalogue unless the caller
    // explicitly requests it (e.g. status=CANCELLED for admin browsing).
    // Quarantined creator content is set to CANCELLED by the moderation pipeline.
    ...(status ? { status } : { status: { not: 'CANCELLED' as const } }),
    ...(type   ? { type }   : {}),
    ...(q
      ? {
          OR: [
            { title:    { contains: q, mode: 'insensitive' as const } },
            { author:   { contains: q, mode: 'insensitive' as const } },
            { synopsis: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(genre && genre !== 'All'
      ? { metadata: { path: ['genres'], array_contains: genre } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.content.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.content.count({ where }),
  ]);

  res.json({
    data: {
      items: items.map(serializeContent),
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/content/:slug
// Single content record with chapter list (published only for readers).
// ---------------------------------------------------------------------------

export async function getContent(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };

  const content = await prisma.content.findUnique({
    where: { slug },
    include: {
      chapters: {
        where: { isPublished: true },
        orderBy: { number: 'asc' },
        select: {
          id:          true,
          number:      true,
          title:       true,
          publishedAt: true,
          wordCount:   true,
        },
      },
    },
  });

  if (!content) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Content not found' },
    });
    return;
  }

  // Block access to quarantined content (status set to CANCELLED by moderation pipeline)
  if (content.status === 'CANCELLED') {
    res.status(451).json({
      data: null,
      error: { code: 'CONTENT_UNAVAILABLE', message: 'This content is not available.' },
    });
    return;
  }

  res.json({
    data: {
      ...serializeContent(content),
      chapters: content.chapters.map((c: (typeof content.chapters)[number]) => ({
        id:          c.id,
        number:      c.number,
        title:       c.title,
        wordCount:   c.wordCount,
        publishedAt: c.publishedAt?.toISOString() ?? null,
      })),
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/content/:slug/chapters/:number
// Single chapter with full bodyText. Requires authentication.
// If bodyText is null (scraped but not yet fetched), triggers on-demand fetch.
//
// L2 FIX: appends `contentMode: 'image' | 'text'` derived from the parent
// content.type — replaces the frontend's brittle bodyText.trimStart().startsWith('[')
// heuristic for determining how to render a chapter.
// ---------------------------------------------------------------------------

/** Content types that render as a vertical image stack, not prose. */
const IMAGE_TYPES = new Set(['MANGA', 'COMIC', 'WEBTOON']);

export async function getChapter(req: Request, res: Response): Promise<void> {
  const { slug }    = req.params as { slug: string };
  const chapterNumber = parseFloat(req.params['number'] ?? '');

  if (isNaN(chapterNumber)) {
    res.status(422).json({
      data: null,
      error: { code: 'INVALID_CHAPTER', message: 'Chapter number must be a number' },
    });
    return;
  }

  const content = await prisma.content.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, type: true, chapterCount: true, source: true },
  });

  if (!content) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Content not found' } });
    return;
  }

  const chapter = await prisma.chapter.findUnique({
    where: { contentId_number: { contentId: content.id, number: chapterNumber } },
    select: {
      id:          true,
      number:      true,
      title:       true,
      bodyText:    true,
      wordCount:   true,
      isPublished: true,
      sourceUrl:   true,
      publishedAt: true,
    },
  });

  if (!chapter || !chapter.isPublished) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Chapter not found' } });
    return;
  }

  // L2 — derive rendering mode from the parent content type, not from bodyText shape
  const contentMode: 'image' | 'text' = IMAGE_TYPES.has(content.type) ? 'image' : 'text';

  // Image-type content (MANGA / COMIC / WEBTOON):
  // CDN image URLs from MangaDex expire after ~15 minutes — always re-fetch.
  if (contentMode === 'image' && chapter.sourceUrl) {
    try {
      const { getProvider } = await import('../scraper/parsers/index.js');
      const provider        = getProvider(chapter.sourceUrl);
      const freshImageUrls  = await provider.extractChapterBody(chapter.sourceUrl);

      const [prevChapter, nextChapter] = await Promise.all([
        prisma.chapter.findFirst({
          where:   { contentId: content.id, number: { lt: chapterNumber }, isPublished: true },
          orderBy: { number: 'desc' },
          select:  { number: true },
        }),
        prisma.chapter.findFirst({
          where:   { contentId: content.id, number: { gt: chapterNumber }, isPublished: true },
          orderBy: { number: 'asc' },
          select:  { number: true },
        }),
      ]);

      // No-store: SW and browser must never cache expiring CDN URLs
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        data: {
          id:          chapter.id,
          number:      chapter.number,
          title:       chapter.title,
          bodyText:    freshImageUrls,
          wordCount:   0,
          isPublished: chapter.isPublished,
          sourceUrl:   chapter.sourceUrl,
          publishedAt: chapter.publishedAt?.toISOString() ?? null,
          prevChapter: prevChapter?.number ?? null,
          nextChapter: nextChapter?.number ?? null,
          // L2 — explicit rendering signal
          contentMode,
          content: {
            id:           content.id,
            slug:         content.slug,
            title:        content.title,
            type:         content.type,
            chapterCount: content.chapterCount,
            source:       content.source,
          },
        },
        error: null,
      });
    } catch (err) {
      res.status(502).json({
        data: null,
        error: {
          code: 'CDN_FETCH_FAILED',
          message: `Could not fetch chapter images: ${(err as Error).message}`,
        },
      });
    }
    return;
  }

  // Text-type content: if bodyText not yet cached, fetch synchronously then return
  // the chapter immediately instead of returning a 202 retry loop.
  // Awaiting here ensures the body is written to the DB before we respond, so the
  // client's next request will find it — no thundering herd of re-fetches.
  if (!chapter.bodyText && chapter.sourceUrl) {
    const { fetchChapterBodyOnDemand } = await import('../scraper/scraperQueue.js');
    const fetchedBody = await fetchChapterBodyOnDemand(chapter.id, chapter.sourceUrl);

    if (!fetchedBody) {
      // Fetch failed — let the client know to retry
      res.status(202).json({
        data: {
          status:        'fetching',
          retryAfter:    10,
          chapterNumber,
          contentSlug:   slug,
        },
        error: null,
      });
      return;
    }

    // Body now available — fall through with updated bodyText
    chapter.bodyText = fetchedBody;
  }

  // Full text chapter — find sibling navigation
  const [prevChapter, nextChapter] = await Promise.all([
    prisma.chapter.findFirst({
      where:   { contentId: content.id, number: { lt: chapterNumber }, isPublished: true },
      orderBy: { number: 'desc' },
      select:  { number: true },
    }),
    prisma.chapter.findFirst({
      where:   { contentId: content.id, number: { gt: chapterNumber }, isPublished: true },
      orderBy: { number: 'asc' },
      select:  { number: true },
    }),
  ]);

  res.json({
    data: {
      id:          chapter.id,
      number:      chapter.number,
      title:       chapter.title,
      bodyText:    chapter.bodyText,
      wordCount:   chapter.wordCount,
      isPublished: chapter.isPublished,
      sourceUrl:   chapter.sourceUrl,
      publishedAt: chapter.publishedAt?.toISOString() ?? null,
      prevChapter: prevChapter?.number ?? null,
      nextChapter: nextChapter?.number ?? null,
      // L2 — explicit rendering signal
      contentMode,
      content: {
        id:           content.id,
        slug:         content.slug,
        title:        content.title,
        type:         content.type,
        chapterCount: content.chapterCount,
        source:       content.source,
      },
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// serializeContent — L6 FIX
//
// Previously used `{ ...c, createdAt: ..., updatedAt: ... }` which spread the
// entire Prisma row onto the response, risking accidental exposure of future
// columns (e.g. internal flags, soft-delete markers, FK ids not in the type).
//
// Now uses an explicit field-by-field mapping that is tightly coupled to the
// ContentSchema in @arcanium/types/src/book.ts.  Any new Prisma column must
// be consciously added here before it appears in API responses.
// ---------------------------------------------------------------------------

type PrismaContentRow = {
  id:            string;
  type:          string;
  status:        string;
  source:        string;
  title:         string;
  slug:          string;
  author:        string | null;
  artist:        string | null;
  synopsis:      string | null;
  coverImageUrl: string | null;
  language:      string;
  sourceUrl:     string | null;
  sourceSite:    string | null;
  metadata:      unknown;
  chapterCount:  number;
  rating:        number | null;
  creatorId:     string | null;
  createdAt:     Date;
  updatedAt:     Date;
};

/**
 * Maps a raw Prisma Content row to the exact wire shape defined by
 * ContentSchema in @arcanium/types/src/book.ts.
 *
 * No additional fields are included — this is the complete whitelist.
 */
function serializeContent(c: PrismaContentRow) {
  return {
    id:            c.id,
    type:          c.type,
    status:        c.status,
    source:        c.source,
    title:         c.title,
    slug:          c.slug,
    author:        c.author,
    artist:        c.artist,
    synopsis:      c.synopsis,
    coverImageUrl: c.coverImageUrl,
    language:      c.language,
    sourceUrl:     c.sourceUrl,
    sourceSite:    c.sourceSite,
    metadata:      (c.metadata ?? {}) as Record<string, unknown>,
    chapterCount:  c.chapterCount,
    rating:        c.rating,
    creatorId:     c.creatorId,
    // Prisma Date → ISO 8601 string (ContentSchema expects z.string().datetime())
    createdAt:     c.createdAt.toISOString(),
    updatedAt:     c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/content/featured
// Public — returns all enabled FeaturedSection entries grouped by key,
// with full content payloads embedded. Used by both Home and Explore pages.
// ---------------------------------------------------------------------------

export async function getFeaturedSections(req: Request, res: Response): Promise<void> {
  const rows = await prisma.featuredSection.findMany({
    where:   { enabled: true },
    orderBy: [{ key: 'asc' }, { sortOrder: 'asc' }],
    include: {
      content: {
        select: {
          id: true, title: true, slug: true, type: true, status: true,
          synopsis: true, coverImageUrl: true, rating: true,
          chapterCount: true, author: true, sourceSite: true,
          metadata: true,
        },
      },
    },
  });

  // Group by section key: { home_featured: [...], explore_spotlight: [...] }
  const grouped: Record<string, {
    id: string; key: string; label: string; sortOrder: number;
    content: typeof rows[0]['content'];
  }[]> = {};

  for (const row of rows) {
    if (!grouped[row.key]) grouped[row.key] = [];
    (grouped[row.key] as typeof grouped[string]).push({
      id:        row.id,
      key:       row.key,
      label:     row.label,
      sortOrder: row.sortOrder,
      content:   row.content,
    });
  }

  res.json({ data: grouped, error: null });
}


// ---------------------------------------------------------------------------
// GET /api/v1/content/recommended
// Personalised "Recommended for You" endpoint.
//
// Algorithm (3 stages):
//   1. Build a preference profile from the user's ReadingProgress & ShelfEntry
//      (genre score map + type score map).  Completed / actively-reading books
//      count double.  Optional ?genre and ?type query params act as bias
//      multipliers on top of the profile (they do NOT hard-filter the pool).
//   2. Fetch a candidate pool (~150 non-CANCELLED, not-in-library books) and
//      score each one against the profile.
//   3. Sort by score DESC, apply a diversity cap (≤3 per genre in top results),
//      return `limit` items (default 8).
//
// Unauthenticated / no-history fallback: top-rated books (averageRating DESC,
// ratingCount DESC, createdAt DESC).
//
// Optional auth — req.user may or may not exist.
// ---------------------------------------------------------------------------

/** Weight multipliers applied to genre/type match scores. */
const SCORE = {
  genreExact:     5,   // 2+ overlapping genres
  genrePartial:   3,   // 1 overlapping genre
  typeMatch:      2,
  ratingGood:     2,   // averageRating ≥ 4.0
  ratingGreat:    1,   // averageRating ≥ 4.5 (stacks)
  popular:        1,   // ratingCount ≥ 10
  creatorUpload:  1,   // CREATOR_UPLOAD source (original content)
  recency:        1,   // published within last 30 days
  biasGenre:      4,   // bonus when the user explicitly requests a genre
  biasType:       3,   // bonus when the user explicitly requests a type
} as const;

/** Max books of the same primary genre in the returned list. */
const GENRE_DIVERSITY_CAP = 3;

interface RecommendationQuery {
  limit?: string;
  genre?: string;  // bias genre (from filter pill)
  type?:  string;  // bias type  (from filter chip)
}

export async function getRecommendations(req: Request, res: Response): Promise<void> {
  const { limit: limitStr, genre: biasGenre, type: biasType } =
    req.query as RecommendationQuery;

  const limit = Math.min(Math.max(parseInt(limitStr ?? '8', 10) || 8, 1), 20);

  // ── Stage 0: resolve user identity (optional auth) ──────────────────────
  const userId: string | null = req.user?.id ?? null;

  // ── Stage 1: build preference profile ───────────────────────────────────

  /** genreScores[genre] = accumulated weight */
  const genreScores: Record<string, number> = {};
  /** typeScores[type] = accumulated weight */
  const typeScores:  Record<string, number> = {};
  /** Set of content IDs already in the user's library (to exclude) */
  const libraryIds = new Set<string>();

  if (userId) {
    // Collect all shelf entries in one query
    const shelfEntries = await prisma.shelfEntry.findMany({
      where: { shelf: { userId } },
      select: { contentId: true },
    });
    for (const e of shelfEntries) libraryIds.add(e.contentId);

    // Collect reading progress with content metadata for genre/type extraction
    const progressRows = await prisma.readingProgress.findMany({
      where:  { userId },
      select: {
        status: true,
        content: {
          select: { type: true, metadata: true },
        },
      },
    });

    for (const row of progressRows) {
      // Completed / currently reading = strong signal (×2)
      const weight = (row.status === 'COMPLETED' || row.status === 'READING') ? 2 : 1;

      // Type preference
      const t = row.content.type;
      typeScores[t] = (typeScores[t] ?? 0) + weight;

      // Genre preferences (metadata.genres is string[])
      const genres = (row.content.metadata as { genres?: string[] })?.genres ?? [];
      for (const g of genres) {
        genreScores[g] = (genreScores[g] ?? 0) + weight;
      }
    }
  }

  const hasProfile = Object.keys(genreScores).length > 0 || Object.keys(typeScores).length > 0;

  // ── Fallback: no user / no history → top-rated ──────────────────────────
  if (!hasProfile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      status: { not: 'CANCELLED' },
      averageRating: { not: null },
    };
    if (biasGenre && biasGenre !== 'All') {
      where['metadata'] = { path: ['genres'], array_contains: biasGenre };
    }
    if (biasType && biasType !== 'All') {
      where['type'] = biasType;
    }

    const items = await prisma.content.findMany({
      where,
      orderBy: [
        { averageRating: 'desc' },
        { ratingCount:   'desc' },
        { createdAt:     'desc' },
      ],
      take: limit,
    });

    res.json({
      data: {
        items:         items.map(serializeContent),
        total:         items.length,
        page:          1,
        limit,
        hasMore:       false,
        isPersonalised: false,
        topGenres:     [],
      },
      error: null,
    });
    return;
  }

  // ── Stage 2: fetch candidate pool & score ────────────────────────────────

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.content.findMany({
    where: {
      status: { not: 'CANCELLED' as const },
      ...(libraryIds.size > 0 ? { id: { notIn: [...libraryIds] } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 150, // reasonable candidate pool
  });

  interface ScoredContent {
    content: typeof candidates[0];
    score:   number;
    genres:  string[];
  }

  const scored: ScoredContent[] = candidates.map((c) => {
    const genres = (c.metadata as { genres?: string[] })?.genres ?? [];
    let score = 0;

    // ── Genre match ────────────────────────────────────────────────────────
    const matchingGenres = genres.filter((g) => (genreScores[g] ?? 0) > 0);
    if (matchingGenres.length >= 2) {
      score += SCORE.genreExact;
    } else if (matchingGenres.length === 1) {
      score += SCORE.genrePartial;
    }
    // Weight by how strong the user's preference is for those genres
    for (const g of matchingGenres) {
      score += Math.min(genreScores[g]! * 0.5, 3); // capped bonus per genre
    }

    // ── Type match ─────────────────────────────────────────────────────────
    if ((typeScores[c.type] ?? 0) > 0) {
      score += SCORE.typeMatch;
      score += Math.min(typeScores[c.type]! * 0.3, 2);
    }

    // ── Quality signals ────────────────────────────────────────────────────
    const rating = c.averageRating ?? (c.rating ?? 0);
    if (rating >= 4.0) score += SCORE.ratingGood;
    if (rating >= 4.5) score += SCORE.ratingGreat;
    if ((c.ratingCount ?? 0) >= 10) score += SCORE.popular;

    // ── Content signals ────────────────────────────────────────────────────
    if (c.source === 'CREATOR_UPLOAD') score += SCORE.creatorUpload;
    if (c.createdAt >= thirtyDaysAgo)  score += SCORE.recency;

    // ── Bias boosts (genre pill / type chip selected by user) ─────────────
    if (biasGenre && biasGenre !== 'All' && genres.includes(biasGenre)) {
      score += SCORE.biasGenre;
    }
    if (biasType && biasType !== 'All' && c.type === biasType) {
      score += SCORE.biasType;
    }

    return { content: c, score, genres };
  });

  // ── Stage 3: sort, diversify, slice ─────────────────────────────────────

  scored.sort((a, b) => b.score - a.score);

  // Diversity pass: track how many of each primary genre we've added
  const genreCounts: Record<string, number> = {};
  const results: typeof scored[0]['content'][] = [];

  for (const { content, genres } of scored) {
    if (results.length >= limit) break;

    const primaryGenre = genres[0] ?? '__none__';
    const count = genreCounts[primaryGenre] ?? 0;

    if (count < GENRE_DIVERSITY_CAP) {
      results.push(content);
      genreCounts[primaryGenre] = count + 1;
    }
  }

  // If diversity pass left us short (all genres hit cap), backfill from remainder
  if (results.length < limit) {
    const resultIds = new Set(results.map((r) => r.id));
    for (const { content } of scored) {
      if (results.length >= limit) break;
      if (!resultIds.has(content.id)) {
        results.push(content);
        resultIds.add(content.id);
      }
    }
  }

  // Top genres for the frontend "Why this?" tooltip
  const topGenres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([g]) => g);

  res.json({
    data: {
      items:          results.map(serializeContent),
      total:          results.length,
      page:           1,
      limit,
      hasMore:        false,
      isPersonalised: true,
      topGenres,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Connect Cards — public endpoint
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/connect
 * Returns all enabled connect cards, ordered by category and displayOrder
 */
export async function getPublicConnectCards(req: Request, res: Response): Promise<void> {
  try {
    const cards = await prisma.connectCard.findMany({
      where: { enabled: true },
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        iconName: true,
        category: true,
        displayOrder: true,
      },
    });

    res.json({ data: cards, error: null });
  } catch (err) {
    console.error('[getPublicConnectCards] Error:', err);
    res.status(500).json({ 
      data: null, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch connect cards' } 
    });
  }
}
