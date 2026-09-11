/**
 * Creator service — Pipeline B upload logic.
 *
 * Verified writers (role = VERIFIED_WRITER | ADMIN) create their own Content
 * records and publish chapters directly on the platform.
 *
 * All mutations enforce ownership: a writer can only edit their own content.
 * Admins can edit any content.
 *
 * Constitution §5: authorization enforced server-side on every operation.
 */

import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  CreateContentSchema,
  UpdateContentSchema,
  CreateChapterSchema,
  UpdateChapterSchema,
} from '@arcanium/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slug generator — pure string operation, no external dep needed. */
function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 2;
  while (await prisma.content.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${attempt++}`;
  }
  return slug;
}

/** Ensure the content belongs to the requesting user (or user is ADMIN). */
async function assertOwnership(
  contentId: string,
  userId: string,
  userRole: string,
): Promise<{ id: string; creatorId: string | null }> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true, creatorId: true },
  });

  if (!content) {
    throw Object.assign(new Error('Content not found'), { statusCode: 404, code: 'NOT_FOUND' });
  }

  if (userRole !== 'ADMIN' && content.creatorId !== userId) {
    throw Object.assign(new Error('You do not own this content'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  return content;
}

// ---------------------------------------------------------------------------
// POST /api/v1/creator/content
// Create a new content record owned by the authenticated creator.
// ---------------------------------------------------------------------------

export async function createContent(req: Request, res: Response): Promise<void> {
  const parsed = CreateContentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const { title, type, synopsis, coverImageUrl, language, genres } = parsed.data;
  const slug = await uniqueSlug(makeSlug(title));

  // Resolve author name: prefer approved application pen name, fall back to displayName
  const [user, approvedApp] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id }, select: { displayName: true } }),
    prisma.creatorApplication.findFirst({
      where:   { userId: req.user.id, status: 'APPROVED' },
      orderBy: { reviewedAt: 'desc' },
      select:  { penName: true },
    }),
  ]);
  const authorName = approvedApp?.penName ?? user?.displayName ?? 'Unknown';

  const content = await prisma.content.create({
    data: {
      title,
      slug,
      type,
      author: authorName,
      synopsis: synopsis ?? null,
      coverImageUrl: coverImageUrl ?? null,
      language: language ?? 'en',
      source: 'CREATOR_UPLOAD',
      creatorId: req.user.id,
      status: 'ONGOING',
      metadata: { genres: genres ?? [], tags: [] },
    },
    select: {
      id: true, title: true, slug: true, type: true, status: true,
      source: true, creatorId: true, author: true, synopsis: true,
      coverImageUrl: true, chapterCount: true, createdAt: true,
    },
  });

  res.status(201).json({ data: { ...content, createdAt: content.createdAt.toISOString() }, error: null });
}

// ---------------------------------------------------------------------------
// GET /api/v1/creator/content
// List the authenticated creator's own content.
// ---------------------------------------------------------------------------

export async function listCreatorContent(req: Request, res: Response): Promise<void> {
  const items = await prisma.content.findMany({
    where: { creatorId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, title: true, slug: true, type: true, status: true,
      author: true, coverImageUrl: true, chapterCount: true,
      createdAt: true, updatedAt: true,
    },
  });

  res.json({
    data: items.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/creator/content/:contentId
// Update metadata on own content.
// ---------------------------------------------------------------------------

export async function updateContent(req: Request, res: Response): Promise<void> {
  const { contentId } = req.params as { contentId: string };

  try {
    await assertOwnership(contentId, req.user.id, req.user.role);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode ?? 500).json({ data: null, error: { code: e.code ?? 'ERROR', message: e.message ?? 'Unknown error' } });
    return;
  }

  const parsed = UpdateContentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const { title, synopsis, coverImageUrl, status, genres } = parsed.data;

  const updated = await prisma.content.update({
    where: { id: contentId },
    data: {
      ...(title        !== undefined ? { title }        : {}),
      ...(synopsis     !== undefined ? { synopsis }     : {}),
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      ...(status       !== undefined ? { status }       : {}),
      ...(genres       !== undefined ? {
        metadata: { genres, tags: [] },
      } : {}),
    },
    select: {
      id: true, title: true, slug: true, type: true, status: true,
      coverImageUrl: true, synopsis: true, chapterCount: true, updatedAt: true,
    },
  });

  res.json({ data: { ...updated, updatedAt: updated.updatedAt.toISOString() }, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/creator/content/:contentId/chapters
// Create a new chapter (draft by default).
// ---------------------------------------------------------------------------

export async function createChapter(req: Request, res: Response): Promise<void> {
  const { contentId } = req.params as { contentId: string };

  try {
    await assertOwnership(contentId, req.user.id, req.user.role);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode ?? 500).json({ data: null, error: { code: e.code ?? 'ERROR', message: e.message ?? 'Unknown error' } });
    return;
  }

  const parsed = CreateChapterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const { number, title, bodyText, isDraft } = parsed.data;
  const wordCount = bodyText.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

  const chapter = await prisma.chapter.create({
    data: {
      contentId,
      number,
      title: title ?? null,
      bodyText,
      wordCount,
      isDraft: isDraft ?? true,
      isPublished: !(isDraft ?? true),
      publishedAt: isDraft ? null : new Date(),
    },
    select: {
      id: true, number: true, title: true, wordCount: true,
      isDraft: true, isPublished: true, publishedAt: true, createdAt: true,
    },
  });

  // Update chapter count on content
  await prisma.content.update({
    where: { id: contentId },
    data: { chapterCount: { increment: 1 } },
  });

  res.status(201).json({
    data: {
      ...chapter,
      publishedAt: chapter.publishedAt?.toISOString() ?? null,
      createdAt: chapter.createdAt.toISOString(),
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/creator/content/:contentId/chapters/:chapterId
// Update chapter body text or title.
// ---------------------------------------------------------------------------

export async function updateChapter(req: Request, res: Response): Promise<void> {
  const { contentId, chapterId } = req.params as { contentId: string; chapterId: string };

  try {
    await assertOwnership(contentId, req.user.id, req.user.role);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode ?? 500).json({ data: null, error: { code: e.code ?? 'ERROR', message: e.message ?? 'Unknown error' } });
    return;
  }

  const parsed = UpdateChapterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const { title, bodyText, number } = parsed.data;
  const wordCount = bodyText
    ? bodyText.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    : undefined;

  const updated = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...(title     !== undefined ? { title }     : {}),
      ...(bodyText  !== undefined ? { bodyText }  : {}),
      ...(wordCount !== undefined ? { wordCount } : {}),
      ...(number    !== undefined ? { number }    : {}),
    },
    select: {
      id: true, number: true, title: true, wordCount: true,
      isDraft: true, isPublished: true, publishedAt: true, updatedAt: true,
    },
  });

  res.json({
    data: {
      ...updated,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/creator/content/:contentId/chapters/:chapterId/publish
// Publish a draft chapter — makes it visible to all readers.
// ---------------------------------------------------------------------------

export async function publishChapter(req: Request, res: Response): Promise<void> {
  const { contentId, chapterId } = req.params as { contentId: string; chapterId: string };

  try {
    await assertOwnership(contentId, req.user.id, req.user.role);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode ?? 500).json({ data: null, error: { code: e.code ?? 'ERROR', message: e.message ?? 'Unknown error' } });
    return;
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, isPublished: true, isDraft: true },
  });

  if (!chapter) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Chapter not found' } });
    return;
  }

  if (chapter.isPublished) {
    res.status(409).json({ data: null, error: { code: 'ALREADY_PUBLISHED', message: 'Chapter is already published' } });
    return;
  }

  const published = await prisma.chapter.update({
    where: { id: chapterId },
    data: { isPublished: true, isDraft: false, publishedAt: new Date() },
    select: {
      id: true, number: true, title: true, isPublished: true, publishedAt: true,
      content: { select: { id: true, creatorId: true } },
    },
  });

  // Auto-flag newly published creator chapters for content moderation review.
  // Creates a ModeratedContent row (status=FLAGGED) so the admin moderation
  // queue immediately surfaces it. Non-blocking — publication succeeds regardless.
  if (published.content.creatorId) {
    const existing = await prisma.moderatedContent.findFirst({
      where:  { contentId: published.content.id },
      select: { id: true, status: true },
    }).catch(() => null);

    if (existing) {
      // Re-queue for review if it was previously cleared
      if (existing.status === 'APPROVED') {
        await prisma.moderatedContent.update({
          where: { id: existing.id },
          data:  { status: 'FLAGGED', flagReason: 'New chapter published — re-queued for editorial review', reportedAt: new Date() },
        }).catch(() => {});
      }
    } else {
      await prisma.moderatedContent.create({
        data: {
          contentId:  published.content.id,
          authorId:   published.content.creatorId,
          flagReason: 'Newly published creator chapter — awaiting editorial review',
          riskScore:  0,
          status:     'FLAGGED',
          reportedAt: new Date(),
        },
      }).catch(() => {});
    }
  }

  res.json({
    data: {
      id:          published.id,
      number:      published.number,
      title:       published.title,
      isPublished: published.isPublished,
      publishedAt: published.publishedAt?.toISOString() ?? null,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/creator/content/:contentId/chapters/:chapterId
// Hard delete — only allowed on draft chapters.
// ---------------------------------------------------------------------------

export async function deleteChapter(req: Request, res: Response): Promise<void> {
  const { contentId, chapterId } = req.params as { contentId: string; chapterId: string };

  try {
    await assertOwnership(contentId, req.user.id, req.user.role);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode ?? 500).json({ data: null, error: { code: e.code ?? 'ERROR', message: e.message ?? 'Unknown error' } });
    return;
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, isDraft: true, isPublished: true },
  });

  if (!chapter) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Chapter not found' } });
    return;
  }

  if (chapter.isPublished && !chapter.isDraft) {
    res.status(403).json({
      data: null,
      error: { code: 'CANNOT_DELETE_PUBLISHED', message: 'Published chapters cannot be deleted. Unpublish first.' },
    });
    return;
  }

  await prisma.chapter.delete({ where: { id: chapterId } });
  await prisma.content.update({
    where: { id: contentId },
    data: { chapterCount: { decrement: 1 } },
  });

  res.json({ data: { message: 'Chapter deleted' }, error: null });
}

// ---------------------------------------------------------------------------
// GET /api/v1/creator/content/:contentId/chapters
// List all chapters for own content (including drafts).
// ---------------------------------------------------------------------------

export async function listCreatorChapters(req: Request, res: Response): Promise<void> {
  const { contentId } = req.params as { contentId: string };

  try {
    await assertOwnership(contentId, req.user.id, req.user.role);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode ?? 500).json({ data: null, error: { code: e.code ?? 'ERROR', message: e.message ?? 'Unknown error' } });
    return;
  }

  const chapters = await prisma.chapter.findMany({
    where: { contentId },
    orderBy: { number: 'asc' },
    select: {
      id: true, number: true, title: true, wordCount: true,
      isDraft: true, isPublished: true, publishedAt: true, createdAt: true,
    },
  });

  res.json({
    data: chapters.map((c) => ({
      ...c,
      publishedAt: c.publishedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    error: null,
  });
}
