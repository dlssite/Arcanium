/**
 * circles.service.ts
 *
 * All user-facing circle handlers. Each handler is a typed Express
 * RequestHandler. Authorization is enforced by middleware before reaching here;
 * these handlers trust req.user and req.circleMembership are already set.
 *
 * Constitution §5: all DB access via Prisma. Constitution §6: server-side auth.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getRanks, computeRank } from './xp.service.js';
import {
  CreateCircleSchema,
  UpdateCircleSchema,
  CreateCirclePostSchema,
  CreateCircleReplySchema,
  StartSessionSchema,
} from '@arcanium/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function rankLabel(rankLevel: number, rankTitle: string): string {
  return `Lv.${rankLevel} ${rankTitle}`;
}

/** Read circle_min_rank_level live from AppConfig — no cache. */
async function getMinRankLevel(): Promise<number> {
  const row = await prisma.appConfig.findUnique({ where: { key: 'circle_min_rank_level' } });
  const parsed = parseInt(row?.value ?? '3', 10);
  return isNaN(parsed) ? 3 : parsed;
}

/** Check whether the FEATURE_FLAG_CIRCLES flag is enabled. */
async function circlesEnabled(): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: 'FEATURE_FLAG_CIRCLES' } });
  return flag?.enabled ?? false;
}

/** Guard: returns true (and sends 503) if circles are disabled. */
async function guardFlag(res: Response): Promise<boolean> {
  if (!(await circlesEnabled())) {
    res.status(503).json({
      data: null,
      error: { code: 'FEATURE_DISABLED', message: 'Reading Circles are not enabled on this instance' },
    });
    return true;
  }
  return false;
}

/**
 * Shape a ReadingCircle DB row into a CircleSummary wire object.
 * Requires: _count.members, sessions (active), ownerId relation pre-loaded.
 */
function shapeCircle(
  c: {
    id: string; name: string; tag: string; description: string | null;
    coverColor: string; visibility: string; isFeatured: boolean;
    featuredOrder: number; isArchived: boolean; ownerId: string;
    createdAt: Date; updatedAt: Date;
    _count: { members: number; posts?: number };
    sessions: { activeNow: number; isActive: boolean; bookTitle: string | null; chapterHint: string | null; startedAt: Date; endedAt: Date | null; id: string }[];
    owner: { displayName: string };
    _pendingRequests?: number;
  },
  membership: { role: string; status: string } | null,
) {
  const activeSession = c.sessions.find(s => s.isActive) ?? null;
  return {
    id:            c.id,
    name:          c.name,
    tag:           c.tag,
    description:   c.description,
    coverColor:    c.coverColor,
    visibility:    c.visibility as 'PUBLIC' | 'PRIVATE',
    memberCount:   c._count.members,
    activeNow:     activeSession?.activeNow ?? 0,
    isFeatured:    c.isFeatured,
    featuredOrder: c.featuredOrder,
    isArchived:    c.isArchived,
    ownerId:       c.ownerId,
    ownerName:     c.owner.displayName,
    activeSession: activeSession
      ? {
          id:          activeSession.id,
          bookTitle:   activeSession.bookTitle,
          chapterHint: activeSession.chapterHint,
          activeNow:   activeSession.activeNow,
          isActive:    true,
          startedAt:   activeSession.startedAt.toISOString(),
          endedAt:     activeSession.endedAt?.toISOString() ?? null,
        }
      : null,
    membership: membership
      ? { role: membership.role as 'OWNER' | 'MODERATOR' | 'MEMBER', status: membership.status as 'ACTIVE' | 'PENDING' | 'BANNED' }
      : null,
    pendingRequestCount: c._pendingRequests ?? 0,
    createdAt: c.createdAt.toISOString(),
  };
}

const CIRCLE_INCLUDE = {
  _count:   { select: { members: true } },
  sessions: {
    where:   { isActive: true },
    select:  { id: true, bookTitle: true, chapterHint: true, activeNow: true, isActive: true, startedAt: true, endedAt: true },
    take:    1,
  },
  owner: { select: { displayName: true } },
} as const;

// ---------------------------------------------------------------------------
// LIST circles  GET /community/circles
// ---------------------------------------------------------------------------

export async function listCircles(req: Request, res: Response): Promise<void> {
  if (await guardFlag(res)) return;

  const query = z.object({
    page:       z.coerce.number().int().min(1).default(1),
    limit:      z.coerce.number().int().min(1).max(50).default(20),
    search:     z.string().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'ALL']).default('PUBLIC'),
  }).parse(req.query);

  const skip = (query.page - 1) * query.limit;

  const where: Record<string, unknown> = {
    isArchived: false,
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
  };

  if (query.visibility === 'PUBLIC')       where['visibility'] = 'PUBLIC';
  else if (query.visibility === 'PRIVATE') where['visibility'] = 'PRIVATE';
  // ALL: no visibility filter — authenticated users can see public circles + circles they are in

  const [circles, total] = await Promise.all([
    prisma.readingCircle.findMany({
      where,
      include: CIRCLE_INCLUDE,
      orderBy: [{ isFeatured: 'desc' }, { featuredOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.readingCircle.count({ where }),
  ]);

  // For each circle, resolve the requesting user's membership (if any)
  const userId = req.user?.id;
  const memberships = userId
    ? await prisma.circleMember.findMany({
        where: { userId, circleId: { in: circles.map(c => c.id) } },
        select: { circleId: true, role: true, status: true },
      })
    : [];
  const membershipMap = Object.fromEntries(memberships.map(m => [m.circleId, m]));

  res.json({
    data: {
      circles: circles.map(c => shapeCircle(c as Parameters<typeof shapeCircle>[0], membershipMap[c.id] ?? null)),
      total,
      page:    query.page,
      hasMore: skip + circles.length < total,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// GET single circle  GET /community/circles/:circleId
// ---------------------------------------------------------------------------

export async function getCircle(req: Request, res: Response): Promise<void> {
  if (await guardFlag(res)) return;

  const { circleId } = req.params as { circleId: string };

  const circle = await prisma.readingCircle.findUnique({
    where:   { id: circleId },
    include: {
      ...CIRCLE_INCLUDE,
      _count: { select: { members: true, posts: true } },
    },
  });

  if (!circle || circle.isArchived) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Circle not found' } });
    return;
  }

  const userId = req.user?.id;
  const membership = userId
    ? await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId } },
        select: { role: true, status: true },
      })
    : null;

  // Non-members of private circles get a preview-only response
  if (circle.visibility === 'PRIVATE' && !membership && req.user?.role !== 'ADMIN') {
    res.json({
      data: shapeCircle(circle as Parameters<typeof shapeCircle>[0], null),
      error: null,
    });
    return;
  }

  const pendingRequestCount =
    circle.visibility === 'PRIVATE' && (membership?.role === 'OWNER' || membership?.role === 'MODERATOR' || req.user?.role === 'ADMIN')
      ? await prisma.circleJoinRequest.count({ where: { circleId, status: 'PENDING' } })
      : 0;

  res.json({
    data: shapeCircle(
      { ...circle, _pendingRequests: pendingRequestCount } as Parameters<typeof shapeCircle>[0],
      membership ?? null,
    ),
    error: null,
  });
}

// ---------------------------------------------------------------------------
// CREATE circle  POST /community/circles
// ---------------------------------------------------------------------------

export async function createCircle(req: Request, res: Response): Promise<void> {
  if (await guardFlag(res)) return;

  const userId = req.user.id;
  const userRole = req.user.role;

  // Role/rank gate — VERIFIED_WRITER, MODERATOR, ADMIN always allowed
  const privilegedRoles = ['VERIFIED_WRITER', 'MODERATOR', 'ADMIN'];
  if (!privilegedRoles.includes(userRole)) {
    // Regular USER: check rank against configurable threshold
    const [user, ranks] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { totalXp: true } }),
      getRanks(),
    ]);
    const minLevel    = await getMinRankLevel();
    const { rank }    = computeRank(user?.totalXp ?? 0, ranks);
    const rankLevel   = rank?.level ?? 0;
    if (rankLevel < minLevel) {
      res.status(403).json({
        data: null,
        error: {
          code: 'RANK_TOO_LOW',
          message: `You need to reach rank level ${minLevel} to create a circle. Your current level is ${rankLevel}.`,
        },
      });
      return;
    }
  }

  const body = CreateCircleSchema.parse(req.body);

  const circle = await prisma.$transaction(async (tx) => {
    const c = await tx.readingCircle.create({
      data: {
        name:        body.name,
        tag:         body.tag,
        description: body.description ?? null,
        coverColor:  body.coverColor ?? 'bg-purple-500',
        visibility:  body.visibility,
        isPublic:    body.visibility === 'PUBLIC',
        ownerId:     userId,
      },
    });
    // Insert creator as OWNER member
    await tx.circleMember.create({
      data: { circleId: c.id, userId, role: 'OWNER', status: 'ACTIVE' },
    });
    return c;
  });

  const full = await prisma.readingCircle.findUniqueOrThrow({
    where:   { id: circle.id },
    include: { ...CIRCLE_INCLUDE, _count: { select: { members: true } } },
  });
  const membership = { role: 'OWNER' as const, status: 'ACTIVE' as const };

  res.status(201).json({
    data: shapeCircle(full as Parameters<typeof shapeCircle>[0], membership),
    error: null,
  });
}

// ---------------------------------------------------------------------------
// UPDATE circle  PATCH /community/circles/:circleId
// ---------------------------------------------------------------------------

export async function updateCircle(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const body = UpdateCircleSchema.parse(req.body);

  const updated = await prisma.readingCircle.update({
    where: { id: circleId },
    data:  {
      ...(body.name        !== undefined ? { name:        body.name }        : {}),
      ...(body.tag         !== undefined ? { tag:         body.tag }         : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.coverColor  !== undefined ? { coverColor:  body.coverColor }  : {}),
      ...(body.visibility  !== undefined ? { visibility:  body.visibility, isPublic: body.visibility === 'PUBLIC' } : {}),
    },
    include: { ...CIRCLE_INCLUDE, _count: { select: { members: true } } },
  });

  const membership = req.circleMembership
    ? { role: req.circleMembership.role, status: req.circleMembership.status }
    : null;

  res.json({ data: shapeCircle(updated as Parameters<typeof shapeCircle>[0], membership), error: null });
}

// ---------------------------------------------------------------------------
// DELETE circle  DELETE /community/circles/:circleId
// ---------------------------------------------------------------------------

export async function deleteCircle(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  await prisma.readingCircle.delete({ where: { id: circleId } });
  res.json({ data: { deleted: true, id: circleId }, error: null });
}

// ---------------------------------------------------------------------------
// JOIN circle  POST /community/circles/:circleId/join
// ---------------------------------------------------------------------------

export async function joinCircle(req: Request, res: Response): Promise<void> {
  if (await guardFlag(res)) return;

  const { circleId } = req.params as { circleId: string };
  const userId = req.user.id;

  const circle = await prisma.readingCircle.findUnique({
    where: { id: circleId },
    select: { visibility: true, isArchived: true },
  });

  if (!circle || circle.isArchived) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Circle not found' } });
    return;
  }

  // Already a member?
  const existing = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (existing) {
    res.status(409).json({ data: null, error: { code: 'ALREADY_MEMBER', message: 'Already a member of this circle' } });
    return;
  }

  if (circle.visibility === 'PUBLIC') {
    await prisma.circleMember.create({ data: { circleId, userId, role: 'MEMBER', status: 'ACTIVE' } });
    res.status(201).json({ data: { joined: true, status: 'ACTIVE' }, error: null });
  } else {
    // PRIVATE: create join request (upsert in case one was rejected before)
    const body = z.object({ message: z.string().max(300).optional() }).parse(req.body);
    const existingRequest = await prisma.circleJoinRequest.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existingRequest && existingRequest.status === 'PENDING') {
      res.status(409).json({ data: null, error: { code: 'REQUEST_PENDING', message: 'A join request is already pending' } });
      return;
    }
    await prisma.circleJoinRequest.upsert({
      where:  { circleId_userId: { circleId, userId } },
      update: { status: 'PENDING', message: body.message ?? null },
      create: { circleId, userId, message: body.message ?? null, status: 'PENDING' },
    });
    res.status(201).json({ data: { joined: false, status: 'PENDING' }, error: null });
  }
}

// ---------------------------------------------------------------------------
// LEAVE circle  DELETE /community/circles/:circleId/leave
// ---------------------------------------------------------------------------

export async function leaveCircle(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const userId = req.user.id;

  const membership = req.circleMembership;
  if (membership?.role === 'OWNER') {
    res.status(403).json({
      data: null,
      error: { code: 'OWNER_CANNOT_LEAVE', message: 'Circle owners cannot leave — delete the circle or transfer ownership instead' },
    });
    return;
  }

  await prisma.circleMember.deleteMany({ where: { circleId, userId } });
  res.json({ data: { left: true }, error: null });
}

// ---------------------------------------------------------------------------
// LIST join requests  GET /community/circles/:circleId/requests
// ---------------------------------------------------------------------------

export async function listJoinRequests(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const status = (req.query['status'] as string | undefined) ?? 'PENDING';

  const requests = await prisma.circleJoinRequest.findMany({
    where:   { circleId, ...(status !== 'ALL' ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}) },
    include: { user: { select: { displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    data: requests.map(r => ({
      id:          r.id,
      circleId:    r.circleId,
      userId:      r.userId,
      displayName: r.user.displayName,
      avatarUrl:   r.user.avatarUrl,
      message:     r.message,
      status:      r.status,
      createdAt:   r.createdAt.toISOString(),
    })),
    error: null,
  });
}

// ---------------------------------------------------------------------------
// APPROVE join request  PATCH /community/circles/:circleId/requests/:requestId/approve
// ---------------------------------------------------------------------------

export async function approveJoinRequest(req: Request, res: Response): Promise<void> {
  const { circleId, requestId } = req.params as { circleId: string; requestId: string };

  const request = await prisma.circleJoinRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, status: true, circleId: true },
  });

  if (!request || request.circleId !== circleId) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Join request not found' } });
    return;
  }
  if (request.status !== 'PENDING') {
    res.status(409).json({ data: null, error: { code: 'ALREADY_RESOLVED', message: 'Request already resolved' } });
    return;
  }

  await prisma.$transaction([
    prisma.circleJoinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', reviewedBy: req.user.id } }),
    prisma.circleMember.upsert({
      where:  { circleId_userId: { circleId, userId: request.userId } },
      update: { status: 'ACTIVE', role: 'MEMBER' },
      create: { circleId, userId: request.userId, role: 'MEMBER', status: 'ACTIVE' },
    }),
  ]);

  res.json({ data: { approved: true, requestId }, error: null });
}

// ---------------------------------------------------------------------------
// REJECT join request  PATCH /community/circles/:circleId/requests/:requestId/reject
// ---------------------------------------------------------------------------

export async function rejectJoinRequest(req: Request, res: Response): Promise<void> {
  const { circleId, requestId } = req.params as { circleId: string; requestId: string };

  const request = await prisma.circleJoinRequest.findUnique({
    where: { id: requestId },
    select: { status: true, circleId: true },
  });
  if (!request || request.circleId !== circleId) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Join request not found' } });
    return;
  }
  if (request.status !== 'PENDING') {
    res.status(409).json({ data: null, error: { code: 'ALREADY_RESOLVED', message: 'Request already resolved' } });
    return;
  }

  await prisma.circleJoinRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', reviewedBy: req.user.id } });
  res.json({ data: { rejected: true, requestId }, error: null });
}

// ---------------------------------------------------------------------------
// LIST members  GET /community/circles/:circleId/members
// ---------------------------------------------------------------------------

export async function listMembers(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '50'), 10)));

  const [members, total] = await Promise.all([
    prisma.circleMember.findMany({
      where:   { circleId, status: { not: 'BANNED' } },
      include: { user: { select: { displayName: true, avatarUrl: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.circleMember.count({ where: { circleId, status: { not: 'BANNED' } } }),
  ]);

  res.json({
    data: members.map(m => ({
      id:          m.id,
      userId:      m.userId,
      displayName: m.user.displayName,
      avatarUrl:   m.user.avatarUrl,
      role:        m.role,
      status:      m.status,
      joinedAt:    m.joinedAt.toISOString(),
    })),
    total,
    page,
    hasMore: (page - 1) * limit + members.length < total,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PROMOTE member  PATCH /community/circles/:circleId/members/:userId/promote
// ---------------------------------------------------------------------------

export async function promoteMember(req: Request, res: Response): Promise<void> {
  const { circleId, userId: targetUserId } = req.params as { circleId: string; userId: string };

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: targetUserId } },
  });
  if (!member) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    return;
  }
  if (member.role === 'OWNER') {
    res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'Cannot change the owner role' } });
    return;
  }

  const updated = await prisma.circleMember.update({
    where: { circleId_userId: { circleId, userId: targetUserId } },
    data:  { role: 'MODERATOR' },
    include: { user: { select: { displayName: true, avatarUrl: true } } },
  });

  res.json({ data: { id: updated.id, userId: targetUserId, role: updated.role }, error: null });
}

// ---------------------------------------------------------------------------
// DEMOTE moderator  PATCH /community/circles/:circleId/members/:userId/demote
// ---------------------------------------------------------------------------

export async function demoteMember(req: Request, res: Response): Promise<void> {
  const { circleId, userId: targetUserId } = req.params as { circleId: string; userId: string };

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: targetUserId } },
  });
  if (!member) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    return;
  }
  if (member.role === 'OWNER') {
    res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'Cannot demote the circle owner' } });
    return;
  }

  const updated = await prisma.circleMember.update({
    where: { circleId_userId: { circleId, userId: targetUserId } },
    data:  { role: 'MEMBER' },
  });

  res.json({ data: { id: updated.id, userId: targetUserId, role: updated.role }, error: null });
}

// ---------------------------------------------------------------------------
// REMOVE member  DELETE /community/circles/:circleId/members/:userId
// ---------------------------------------------------------------------------

export async function removeMember(req: Request, res: Response): Promise<void> {
  const { circleId, userId: targetUserId } = req.params as { circleId: string; userId: string };

  const target = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: targetUserId } },
  });
  if (!target) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    return;
  }
  if (target.role === 'OWNER') {
    res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Cannot remove the circle owner' } });
    return;
  }

  // MODERATORs can only remove MEMBERs, not other MODERATORs
  const requesterRole = req.circleMembership?.role;
  if (requesterRole === 'MODERATOR' && target.role === 'MODERATOR') {
    res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Moderators cannot remove other moderators' } });
    return;
  }

  await prisma.circleMember.delete({ where: { circleId_userId: { circleId, userId: targetUserId } } });
  res.json({ data: { removed: true, userId: targetUserId }, error: null });
}

// ---------------------------------------------------------------------------
// LIST posts  GET /community/circles/:circleId/posts
// ---------------------------------------------------------------------------

export async function listPosts(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10));
  const limit = Math.min(50,  Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));
  const type  = req.query['type'] as 'MARGINALIA' | 'DISCUSSION' | undefined;

  const userId = req.user?.id;

  const [posts, total] = await Promise.all([
    prisma.circlePost.findMany({
      where: { circleId, isRemoved: false, ...(type ? { type } : {}) },
      include: {
        author: { select: { displayName: true, avatarUrl: true, totalXp: true } },
        replies: {
          where:   { isRemoved: false },
          include: { author: { select: { displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
          take:    2,
        },
        echoes: userId ? { where: { userId }, select: { id: true } } : false,
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.circlePost.count({ where: { circleId, isRemoved: false, ...(type ? { type } : {}) } }),
  ]);

  // Resolve rank for each unique author
  const ranks = await getRanks();

  const shaped = posts.map(p => {
    const { rank } = computeRank(p.author.totalXp ?? 0, ranks);
    const roleLabel = rank ? rankLabel(rank.level, rank.title) : 'Scholar';
    return {
      id:         p.id,
      circleId:   p.circleId,
      authorId:   p.authorId,
      author:     p.author.displayName,
      avatarUrl:  p.author.avatarUrl,
      role:       roleLabel,
      time:       relativeTime(p.createdAt),
      type:       p.type,
      quote:      p.quote,
      chapter:    p.chapter,
      reflection: p.reflection,
      title:      p.title,
      body:       p.body,
      echoCount:  p.echoCount,
      replyCount: p.replyCount,
      isPinned:   p.isPinned,
      isRemoved:  p.isRemoved,
      echoed:     Array.isArray((p as { echoes?: unknown[] }).echoes) && (p as { echoes: unknown[] }).echoes.length > 0,
      createdAt:  p.createdAt.toISOString(),
      replyPreview: p.replies.map(r => ({
        id:        r.id,
        postId:    r.postId,
        authorId:  r.authorId,
        author:    r.author.displayName,
        avatarUrl: r.author.avatarUrl,
        body:      r.body,
        isRemoved: r.isRemoved,
        time:      relativeTime(r.createdAt),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  res.json({ data: { posts: shaped, total, page, hasMore: (page - 1) * limit + posts.length < total }, error: null });
}

// ---------------------------------------------------------------------------
// CREATE post  POST /community/circles/:circleId/posts
// ---------------------------------------------------------------------------

export async function createPost(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const userId = req.user.id;
  const body = CreateCirclePostSchema.parse(req.body);

  const post = await prisma.circlePost.create({
    data: {
      circleId,
      authorId:   userId,
      type:       body.type,
      quote:      body.type === 'MARGINALIA' ? body.quote      : null,
      chapter:    body.type === 'MARGINALIA' ? (body.chapter ?? null) : null,
      reflection: body.type === 'MARGINALIA' ? body.reflection : null,
      title:      body.type === 'DISCUSSION' ? body.title      : null,
      body:       body.type === 'DISCUSSION' ? body.body       : null,
    },
    include: { author: { select: { displayName: true, avatarUrl: true, totalXp: true } } },
  });

  const ranks = await getRanks();
  const { rank } = computeRank(post.author.totalXp ?? 0, ranks);

  res.status(201).json({
    data: {
      id:         post.id,
      circleId:   post.circleId,
      authorId:   post.authorId,
      author:     post.author.displayName,
      avatarUrl:  post.author.avatarUrl,
      role:       rank ? rankLabel(rank.level, rank.title) : 'Scholar',
      time:       'Just now',
      type:       post.type,
      quote:      post.quote,
      chapter:    post.chapter,
      reflection: post.reflection,
      title:      post.title,
      body:       post.body,
      echoCount:  0,
      replyCount: 0,
      isPinned:   false,
      isRemoved:  false,
      echoed:     false,
      createdAt:  post.createdAt.toISOString(),
      replyPreview: [],
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// DELETE post  DELETE /community/circles/:circleId/posts/:postId
// ---------------------------------------------------------------------------

export async function deletePost(req: Request, res: Response): Promise<void> {
  const { circleId, postId } = req.params as { circleId: string; postId: string };
  const userId = req.user.id;

  const post = await prisma.circlePost.findUnique({ where: { id: postId }, select: { authorId: true, circleId: true } });
  if (!post || post.circleId !== circleId) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return;
  }

  const role = req.circleMembership?.role;
  const isAuthor = post.authorId === userId;
  const canDelete = isAuthor || role === 'OWNER' || role === 'MODERATOR' || req.user?.role === 'ADMIN';
  if (!canDelete) {
    res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'You cannot delete this post' } });
    return;
  }

  await prisma.circlePost.update({ where: { id: postId }, data: { isRemoved: true } });
  res.json({ data: { removed: true, postId }, error: null });
}

// ---------------------------------------------------------------------------
// ECHO post  POST /community/circles/:circleId/posts/:postId/echo
// Unique-per-user toggle — mirrors toggleEcho in review.service.ts
// ---------------------------------------------------------------------------

export async function echoPost(req: Request, res: Response): Promise<void> {
  if (await guardFlag(res)) return;

  const { postId } = req.params as { circleId: string; postId: string };
  const userId = req.user.id;

  const post = await prisma.circlePost.findUnique({ where: { id: postId }, select: { id: true, echoCount: true, isRemoved: true } });
  if (!post || post.isRemoved) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return;
  }

  const existingEcho = await prisma.circlePostEcho.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  let echoed: boolean;
  let echoCount: number;

  if (existingEcho) {
    // Un-echo
    const [, updated] = await prisma.$transaction([
      prisma.circlePostEcho.delete({ where: { id: existingEcho.id } }),
      prisma.circlePost.update({ where: { id: postId }, data: { echoCount: { decrement: 1 } }, select: { echoCount: true } }),
    ]);
    echoed = false;
    echoCount = Math.max(0, updated.echoCount);
  } else {
    // Echo
    const [, updated] = await prisma.$transaction([
      prisma.circlePostEcho.create({ data: { postId, userId } }),
      prisma.circlePost.update({ where: { id: postId }, data: { echoCount: { increment: 1 } }, select: { echoCount: true } }),
    ]);
    echoed = true;
    echoCount = updated.echoCount;
  }

  res.json({ data: { postId, echoed, echoCount }, error: null });
}

// ---------------------------------------------------------------------------
// PIN post  PATCH /community/circles/:circleId/posts/:postId/pin
// ---------------------------------------------------------------------------

export async function pinPost(req: Request, res: Response): Promise<void> {
  const { postId } = req.params as { circleId: string; postId: string };

  const post = await prisma.circlePost.findUnique({ where: { id: postId }, select: { isPinned: true } });
  if (!post) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return;
  }

  const updated = await prisma.circlePost.update({
    where: { id: postId },
    data:  { isPinned: !post.isPinned },
    select: { id: true, isPinned: true },
  });

  res.json({ data: updated, error: null });
}

// ---------------------------------------------------------------------------
// LIST replies  GET /community/circles/:circleId/posts/:postId/replies
// ---------------------------------------------------------------------------

export async function listReplies(req: Request, res: Response): Promise<void> {
  const { postId } = req.params as { circleId: string; postId: string };
  const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));

  const [replies, total] = await Promise.all([
    prisma.circlePostReply.findMany({
      where:   { postId, isRemoved: false },
      include: { author: { select: { displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.circlePostReply.count({ where: { postId, isRemoved: false } }),
  ]);

  res.json({
    data: {
      replies: replies.map(r => ({
        id:        r.id,
        postId:    r.postId,
        authorId:  r.authorId,
        author:    r.author.displayName,
        avatarUrl: r.author.avatarUrl,
        body:      r.body,
        isRemoved: r.isRemoved,
        time:      relativeTime(r.createdAt),
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      hasMore: (page - 1) * limit + replies.length < total,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// CREATE reply  POST /community/circles/:circleId/posts/:postId/replies
// ---------------------------------------------------------------------------

export async function createReply(req: Request, res: Response): Promise<void> {
  const { postId } = req.params as { circleId: string; postId: string };
  const userId = req.user.id;
  const body = CreateCircleReplySchema.parse(req.body);

  const post = await prisma.circlePost.findUnique({ where: { id: postId }, select: { id: true, isRemoved: true } });
  if (!post || post.isRemoved) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return;
  }

  const [reply] = await prisma.$transaction([
    prisma.circlePostReply.create({
      data:    { postId, authorId: userId, body: body.body },
      include: { author: { select: { displayName: true, avatarUrl: true } } },
    }),
    prisma.circlePost.update({ where: { id: postId }, data: { replyCount: { increment: 1 } } }),
  ]);

  res.status(201).json({
    data: {
      id:        reply.id,
      postId:    reply.postId,
      authorId:  reply.authorId,
      author:    reply.author.displayName,
      avatarUrl: reply.author.avatarUrl,
      body:      reply.body,
      isRemoved: reply.isRemoved,
      time:      'Just now',
      createdAt: reply.createdAt.toISOString(),
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// DELETE reply  DELETE /community/circles/:circleId/posts/:postId/replies/:replyId
// ---------------------------------------------------------------------------

export async function deleteReply(req: Request, res: Response): Promise<void> {
  const { postId, replyId } = req.params as { circleId: string; postId: string; replyId: string };
  const userId = req.user.id;

  const reply = await prisma.circlePostReply.findUnique({ where: { id: replyId }, select: { authorId: true, postId: true } });
  if (!reply || reply.postId !== postId) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Reply not found' } });
    return;
  }

  const role     = req.circleMembership?.role;
  const isAuthor = reply.authorId === userId;
  const canDelete = isAuthor || role === 'OWNER' || role === 'MODERATOR' || req.user?.role === 'ADMIN';
  if (!canDelete) {
    res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'You cannot delete this reply' } });
    return;
  }

  await prisma.$transaction([
    prisma.circlePostReply.update({ where: { id: replyId }, data: { isRemoved: true } }),
    prisma.circlePost.update({ where: { id: postId }, data: { replyCount: { decrement: 1 } } }),
  ]);

  res.json({ data: { removed: true, replyId }, error: null });
}

// ---------------------------------------------------------------------------
// LIST sessions  GET /community/circles/:circleId/sessions
// ---------------------------------------------------------------------------

export async function listSessions(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };

  const sessions = await prisma.circleSession.findMany({
    where:   { circleId },
    orderBy: [{ isActive: 'desc' }, { startedAt: 'desc' }],
  });

  res.json({
    data: sessions.map(s => ({
      id:          s.id,
      bookTitle:   s.bookTitle,
      chapterHint: s.chapterHint,
      activeNow:   s.activeNow,
      isActive:    s.isActive,
      startedAt:   s.startedAt.toISOString(),
      endedAt:     s.endedAt?.toISOString() ?? null,
    })),
    error: null,
  });
}

// ---------------------------------------------------------------------------
// START session  POST /community/circles/:circleId/sessions
// ---------------------------------------------------------------------------

export async function startSession(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };
  const body = StartSessionSchema.parse(req.body);

  // Archive any existing active session + create new one atomically
  const session = await prisma.$transaction(async (tx) => {
    await tx.circleSession.updateMany({
      where: { circleId, isActive: true },
      data:  { isActive: false, endedAt: new Date() },
    });
    return tx.circleSession.create({
      data: {
        circleId,
        bookTitle:   body.bookTitle   ?? null,
        chapterHint: body.chapterHint ?? null,
        isActive:    true,
        startedAt:   new Date(),
      },
    });
  });

  res.status(201).json({
    data: {
      id:          session.id,
      bookTitle:   session.bookTitle,
      chapterHint: session.chapterHint,
      activeNow:   session.activeNow,
      isActive:    session.isActive,
      startedAt:   session.startedAt.toISOString(),
      endedAt:     null,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// END session  PATCH /community/circles/:circleId/sessions/active/end
// ---------------------------------------------------------------------------

export async function endSession(req: Request, res: Response): Promise<void> {
  const { circleId } = req.params as { circleId: string };

  const active = await prisma.circleSession.findFirst({ where: { circleId, isActive: true } });
  if (!active) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'No active session' } });
    return;
  }

  const updated = await prisma.circleSession.update({
    where: { id: active.id },
    data:  { isActive: false, endedAt: new Date() },
  });

  res.json({
    data: {
      id:          updated.id,
      bookTitle:   updated.bookTitle,
      chapterHint: updated.chapterHint,
      activeNow:   updated.activeNow,
      isActive:    false,
      startedAt:   updated.startedAt.toISOString(),
      endedAt:     updated.endedAt?.toISOString() ?? null,
    },
    error: null,
  });
}
