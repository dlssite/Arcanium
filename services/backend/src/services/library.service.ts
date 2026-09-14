import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AddToShelfSchema, UpsertProgressSchema } from '@arcanium/types';
import { grantXp, checkStreakMilestones } from './xp.service.js';

// ---------------------------------------------------------------------------
// GET /api/v1/library
// Returns all of the authenticated user's shelves with their entries and
// per-entry reading progress. Default shelves are ordered by sortOrder;
// entries within each shelf are ordered by addedAt descending.
// ---------------------------------------------------------------------------

export async function getLibrary(req: Request, res: Response): Promise<void> {
  const shelves = await prisma.shelf.findMany({
    where: { userId: req.user.id },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      isDefault: true,
      sortOrder: true,
      entries: {
        orderBy: { addedAt: 'desc' },
        select: {
          id: true,         // shelfEntryId
          addedAt: true,
          note: true,
          sortOrder: true,
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
              author: true,
              synopsis: true,
              coverImageUrl: true,
              chapterCount: true,
              rating: true,
              type: true,
              status: true,
              metadata: true,
            },
          },
        },
      },
    },
  });

  // Fetch all reading progress for this user in one query, then join in memory.
  // Avoids N+1 — one extra query instead of one per entry.
  const contentIds = [
    ...new Set(
      shelves.flatMap((s: (typeof shelves)[number]) => s.entries.map((e: (typeof s.entries)[number]) => e.content.id)),
    ),
  ];

  const progressRows =
    contentIds.length > 0
      ? await prisma.readingProgress.findMany({
          where: { userId: req.user.id, contentId: { in: contentIds } },
          select: {
            contentId: true,
            status: true,
            lastChapterRead: true,
            scrollPosition: true,
            lastReadAt: true,
            startedAt: true,
            completedAt: true,
          },
        })
      : [];

  const progressByContentId = Object.fromEntries(
    progressRows.map((p) => [p.contentId, p]),
  );

  // Shape the response to match LibraryResponseSchema
  const shaped = shelves.map((shelf: (typeof shelves)[number]) => ({
    id: shelf.id,
    name: shelf.name,
    isDefault: shelf.isDefault,
    sortOrder: shelf.sortOrder,
    entries: shelf.entries.map((entry: (typeof shelf.entries)[number]) => ({
      shelfEntryId: entry.id,
      addedAt: entry.addedAt.toISOString(),
      note: entry.note,
      sortOrder: entry.sortOrder,
      content: entry.content,
      progress: progressByContentId[entry.content.id]
        ? {
            ...progressByContentId[entry.content.id],
            lastReadAt:
              progressByContentId[entry.content.id]!.lastReadAt?.toISOString() ?? null,
            startedAt:
              progressByContentId[entry.content.id]!.startedAt?.toISOString() ?? null,
            completedAt:
              progressByContentId[entry.content.id]!.completedAt?.toISOString() ?? null,
          }
        : null,
    })),
  }));

  res.json({ data: { shelves: shaped }, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/library/shelves/:shelfId/entries
// Add a content item to a shelf. Idempotent — adding the same item twice
// returns 200 instead of an error.
// Also upserts a ReadingProgress row with PLAN_TO_READ if none exists.
// ---------------------------------------------------------------------------

export async function addToShelf(req: Request, res: Response): Promise<void> {
  const { shelfId } = req.params as { shelfId: string };

  const parsed = AddToShelfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i: { message: string }) => i.message).join('; '),
      },
    });
    return;
  }

  const { contentId } = parsed.data;

  // Verify the shelf belongs to this user
  const shelf = await prisma.shelf.findFirst({
    where: { id: shelfId, userId: req.user.id },
  });

  if (!shelf) {
    res.status(404).json({
      data: null,
      error: { code: 'SHELF_NOT_FOUND', message: 'Shelf not found' },
    });
    return;
  }

  // Verify content exists
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) {
    res.status(404).json({
      data: null,
      error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' },
    });
    return;
  }

  // Upsert — idempotent add
  await prisma.shelfEntry.upsert({
    where: { shelfId_contentId: { shelfId, contentId } },
    update: {},
    create: { shelfId, contentId },
  });

  // Ensure a ReadingProgress row exists (creates with PLAN_TO_READ if new)
  await prisma.readingProgress.upsert({
    where: { userId_contentId: { userId: req.user.id, contentId } },
    update: {},
    create: { userId: req.user.id, contentId, status: 'PLAN_TO_READ' },
  });

  // Grant XP for adding a book (idempotent — once per book per user)
  grantXp(req.user.id, 'LIBRARY_ADD', { contentId }).catch(() => {/* non-blocking */});

  res.json({ data: { message: 'Added to shelf' }, error: null });
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/library/shelves/:shelfId/entries/:contentId
// ---------------------------------------------------------------------------

export async function removeFromShelf(
  req: Request,
  res: Response,
): Promise<void> {
  const { shelfId, contentId } = req.params as {
    shelfId: string;
    contentId: string;
  };

  // Verify ownership before delete
  const shelf = await prisma.shelf.findFirst({
    where: { id: shelfId, userId: req.user.id },
  });

  if (!shelf) {
    res.status(404).json({
      data: null,
      error: { code: 'SHELF_NOT_FOUND', message: 'Shelf not found' },
    });
    return;
  }

  await prisma.shelfEntry.deleteMany({
    where: { shelfId, contentId },
  });

  res.json({ data: { message: 'Removed from shelf' }, error: null });
}

// ---------------------------------------------------------------------------
// PUT /api/v1/library/progress/:contentId
// Upsert reading progress for a (user, content) pair.
// ---------------------------------------------------------------------------

export async function upsertProgress(
  req: Request,
  res: Response,
): Promise<void> {
  const { contentId } = req.params as { contentId: string };

  const parsed = UpsertProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i: { message: string }) => i.message).join('; '),
      },
    });
    return;
  }

  const { status, lastChapterRead, scrollPosition } = parsed.data;

  // Check if content exists before trying to upsert progress
  const contentExists = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true, title: true },
  });

  if (!contentExists) {
    console.warn(`[Progress] Content not found: ${contentId}`);
    res.status(404).json({
      data: null,
      error: {
        code: 'CONTENT_NOT_FOUND',
        message: `Content with ID ${contentId} not found. The content may have been deleted or the database was reseeded. Please clear your browser cache and refresh.`,
      },
    });
    return;
  }

  console.log(`[Progress] Tracking progress for "${contentExists.title}" (${contentId})`);

  // Auto-add to "Reading" shelf if user starts reading a book not in their library
  // This ensures progress tracking works and the book appears in "Currently Reading"
  if (status === 'READING') {
    const readingShelf = await prisma.shelf.findFirst({
      where: { userId: req.user.id, name: 'Reading' },
      select: { id: true },
    });

    if (readingShelf) {
      // Check if already in this shelf
      const existing = await prisma.shelfEntry.findUnique({
        where: {
          shelfId_contentId: {
            shelfId: readingShelf.id,
            contentId,
          },
        },
      });

      // If not in "Reading" shelf, add it now
      if (!existing) {
        await prisma.shelfEntry.create({
          data: {
            shelfId: readingShelf.id,
            contentId,
            addedAt: new Date(),
          },
        });
      }
    }
  }

  const now = new Date();
  const progress = await prisma.readingProgress.upsert({
    where: { userId_contentId: { userId: req.user.id, contentId } },
    update: {
      status,
      lastReadAt: now,
      ...(lastChapterRead !== undefined ? { lastChapterRead } : {}),
      ...(scrollPosition !== undefined ? { scrollPosition } : {}),
      ...(status === 'COMPLETED' ? { completedAt: now } : {}),
    },
    create: {
      userId: req.user.id,
      contentId,
      status,
      lastReadAt: now,
      ...(lastChapterRead !== undefined ? { lastChapterRead } : {}),
      ...(scrollPosition !== undefined ? { scrollPosition } : {}),
      ...(status === 'READING' ? { startedAt: now } : {}),
      ...(status === 'COMPLETED' ? { completedAt: now } : {}),
    },
  });

  // ── XP grants (non-blocking, idempotent) ────────────────────────────────
  const userId = req.user.id;

  if (status === 'COMPLETED') {
    // Book complete — 100 XP (once per book per user)
    grantXp(userId, 'BOOK_COMPLETE', { contentId }).catch(() => {});
  } else if (status === 'READING' && lastChapterRead !== undefined) {
    // Chapter read — 5 XP (once per chapter per user, keyed by contentId+chapter)
    grantXp(userId, 'CHAPTER_READ', { contentId, chapter: lastChapterRead }).catch(() => {});
  }

  // Compute streak from existing progress and check milestones
  ;(async () => {
    try {
      const allProgress = await prisma.readingProgress.findMany({
        where: { userId },
        select: { lastReadAt: true },
      });
      const today = new Date(); today.setHours(0,0,0,0);
      const readDays = new Set(
        allProgress
          .filter((p: { lastReadAt: Date | null }) => p.lastReadAt)
          .map((p: { lastReadAt: Date | null }) => {
            const d = new Date(p.lastReadAt!); d.setHours(0,0,0,0); return d.getTime();
          })
      );
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        if (readDays.has(d.getTime())) streak++; else break;
      }
      await checkStreakMilestones(userId, streak);
    } catch { /* non-blocking */ }
  })();

  res.json({ data: { message: 'Progress updated', progressId: progress.id }, error: null });
}
