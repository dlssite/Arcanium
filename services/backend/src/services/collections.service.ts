import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Content select shape — same whitelist used by content.service
// ---------------------------------------------------------------------------
const CONTENT_SELECT = {
  id: true, title: true, slug: true, type: true, status: true,
  synopsis: true, coverImageUrl: true, rating: true,
  chapterCount: true, author: true, sourceSite: true, metadata: true,
} as const;

// ---------------------------------------------------------------------------
// GET /api/v1/collections — public list of enabled collections (no books)
// ---------------------------------------------------------------------------
export async function listCollections(req: Request, res: Response): Promise<void> {
  const collections = await prisma.collection.findMany({
    where:   { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { entries: true } } },
  });
  res.json({ data: collections, error: null });
}

// ---------------------------------------------------------------------------
// GET /api/v1/collections/:slug — public collection detail with all books
// ---------------------------------------------------------------------------
export async function getCollection(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      _count: { select: { entries: true } },
      entries: {
        where:   {},
        orderBy: { sortOrder: 'asc' },
        include: { content: { select: CONTENT_SELECT } },
      },
    },
  });
  if (!collection || !collection.enabled) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Collection not found' } });
    return;
  }
  res.json({ data: collection, error: null });
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------
const CollectionUpsertSchema = z.object({
  name:        z.string().min(1).max(120),
  slug:        z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'slug must be lowercase-kebab-case'),
  description: z.string().max(1000).optional(),
  coverColor:  z.string().max(60).optional(),
  enabled:     z.boolean().optional(),
  sortOrder:   z.coerce.number().int().optional(),
});

const AddEntrySchema = z.object({
  contentId: z.string().cuid(),
  sortOrder: z.coerce.number().int().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/collections — admin list (includes disabled)
// ---------------------------------------------------------------------------
export async function adminListCollections(req: Request, res: Response): Promise<void> {
  const collections = await prisma.collection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: { select: { entries: true } },
      entries: {
        orderBy: { sortOrder: 'asc' },
        take: 4,  // preview thumbnails only
        include: { content: { select: { id: true, title: true, coverImageUrl: true } } },
      },
    },
  });
  res.json({ data: collections, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/admin/collections
// ---------------------------------------------------------------------------
export async function createCollection(req: Request, res: Response): Promise<void> {
  const parsed = CollectionUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const existing = await prisma.collection.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    res.status(409).json({ data: null, error: { code: 'CONFLICT', message: `Slug "${parsed.data.slug}" is already taken` } });
    return;
  }
  const adminId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;
  const { description, coverColor, enabled, sortOrder, ...rest } = parsed.data;
  const collection = await prisma.collection.create({
    data: {
      ...rest,
      description: description ?? '',
      coverColor:  coverColor  ?? 'bg-purple-400',
      enabled:     enabled     ?? true,
      sortOrder:   sortOrder   ?? 0,
      createdBy:   adminId,
    },
  });
  res.status(201).json({ data: collection, error: null });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/collections/:id
// ---------------------------------------------------------------------------
export async function updateCollection(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const parsed = CollectionUpsertSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const collection = await prisma.collection.update({
    where: { id },
    data:  parsed.data as never,
  }).catch(() => null);
  if (!collection) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Collection not found' } }); return; }
  res.json({ data: collection, error: null });
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/admin/collections/:id
// ---------------------------------------------------------------------------
export async function deleteCollection(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await prisma.collection.delete({ where: { id } }).catch(() => null);
  res.json({ data: { deleted: true, id }, error: null });
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/collections/:id/entries — full entry list with content
// ---------------------------------------------------------------------------
export async function listCollectionEntries(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const entries = await prisma.collectionEntry.findMany({
    where:   { collectionId: id },
    orderBy: { sortOrder: 'asc' },
    include: { content: { select: CONTENT_SELECT } },
  });
  res.json({ data: entries, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/admin/collections/:id/entries — add a book
// ---------------------------------------------------------------------------
export async function addCollectionEntry(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const parsed = AddEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const { contentId, sortOrder } = parsed.data;
  const maxOrder = await prisma.collectionEntry.aggregate({ _max: { sortOrder: true }, where: { collectionId: id } });
  const nextOrder = sortOrder ?? ((maxOrder._max.sortOrder ?? -1) + 1);
  const entry = await prisma.collectionEntry.upsert({
    where:  { collectionId_contentId: { collectionId: id, contentId } },
    update: { sortOrder: nextOrder },
    create: { collectionId: id, contentId, sortOrder: nextOrder },
    include: { content: { select: CONTENT_SELECT } },
  });
  res.status(201).json({ data: entry, error: null });
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/admin/collections/:id/entries/:entryId
// ---------------------------------------------------------------------------
export async function removeCollectionEntry(req: Request, res: Response): Promise<void> {
  const { entryId } = req.params as { id: string; entryId: string };
  await prisma.collectionEntry.delete({ where: { id: entryId } }).catch(() => null);
  res.json({ data: { removed: true, id: entryId }, error: null });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/collections/entries/:entryId — reorder
// ---------------------------------------------------------------------------
export async function reorderCollectionEntry(req: Request, res: Response): Promise<void> {
  const { entryId } = req.params as { entryId: string };
  const { sortOrder } = req.body as { sortOrder: number };
  const entry = await prisma.collectionEntry.update({
    where: { id: entryId },
    data:  { sortOrder },
    include: { content: { select: CONTENT_SELECT } },
  }).catch(() => null);
  if (!entry) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Entry not found' } }); return; }
  res.json({ data: entry, error: null });
}
