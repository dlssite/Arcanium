import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']);
const UserRoleSchema   = z.enum(['USER', 'VERIFIED_WRITER', 'MODERATOR', 'ADMIN']);

const UpdateStatusBodySchema = z.object({
  status: UserStatusSchema,
});

const UpdateRoleBodySchema = z.object({
  role: UserRoleSchema,
});

const UsersQuerySchema = z.object({
  search: z.string().optional(),
  role:   UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// Feature Flags validation
const FeatureFlagCategorySchema = z.enum([
  'AI_LIBER',
  'CREATOR_ECONOMY',
  'CORE_READER',
  'SYSTEM',
]);

const UpdateFeatureFlagBodySchema = z.object({
  enabled:     z.boolean().optional(),
  rolloutPct:  z.number().int().min(0).max(100).optional(),
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const CreateFeatureFlagBodySchema = z.object({
  key:         z.string().min(1).max(100).regex(/^[A-Z_]+$/),
  name:        z.string().min(1).max(100),
  description: z.string().max(500),
  category:    FeatureFlagCategorySchema,
  enabled:     z.boolean().default(false),
  rolloutPct:  z.number().int().min(0).max(100).default(0),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reading stats helpers
// ---------------------------------------------------------------------------

/**
 * Derives per-user reading metrics from their ReadingProgress rows.
 *
 * booksRead         — count of COMPLETED entries (finished books only)
 * booksActive       — count of READING entries currently in progress
 * totalReadingHours — proxy: each completed title ≈ 3 h, each in-progress ≈ 0.5 h
 *                     (matches the formula in users.service.ts so both surfaces agree)
 * streakDays        — longest run of consecutive calendar days where
 *                     lastReadAt was updated, counting backwards from today
 */
function computeReadingStats(progress: { status: string; lastReadAt: Date | null }[]) {
  const booksRead   = progress.filter(p => p.status === 'COMPLETED').length;
  const booksActive = progress.filter(p => p.status === 'READING').length;
  // Same formula as users.service.ts so admin and web app show the same number
  const totalReadingHours = Math.round(booksRead * 3 + booksActive * 0.5);

  // Streak: collect unique calendar dates that had a read event, walk
  // backwards from today counting consecutive days — same logic as users.service.ts.
  const readDates = new Set(
    progress
      .filter(p => p.lastReadAt !== null)
      .map(p => {
        const d = new Date(p.lastReadAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
  );

  let streakDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (readDates.has(d.getTime())) {
      streakDays++;
    } else if (i > 0) {
      break;
    }
  }

  return { booksRead, booksActive, totalReadingHours, streakDays };
}

/**
 * Maps a Prisma User row to the wire shape the admin UI expects (AdminUser).
 * Derives username from email (part before @) as the DB has no username field.
 * Computes archiveLevel, streakDays, totalReadingHours, booksRead, shelfCount
 * from real activity data.
 */
function serializeAdminUser(
  user: {
    id:          string;
    email:       string;
    displayName: string;
    avatarUrl:   string | null;
    role:        string;
    status:      string;
    createdAt:   Date;
    updatedAt:   Date;
    _count: {
      shelves:         number;
      aiActionLogs:    number;
    };
    // Aggregated reading stats passed in from the caller
    booksRead:          number;
    booksActive:        number;
    streakDays:         number;
    totalReadingHours:  number;
  }
) {
  const username = user.email.split('@')[0] ?? user.email;

  const activityScore = user.booksRead * 3 + user.totalReadingHours;
  const archiveLevel  =
    activityScore >= 200 ? 5
    : activityScore >= 100 ? 4
    : activityScore >= 50  ? 3
    : activityScore >= 20  ? 2
    : 1;

  return {
    id:                 user.id,
    email:              user.email,
    username,
    displayName:        user.displayName,
    avatarUrl:          user.avatarUrl,
    role:               user.role,
    status:             user.status,
    streakDays:         user.streakDays,
    totalReadingHours:  user.totalReadingHours,
    shelfCount:         user._count.shelves,
    booksRead:          user.booksRead,
    archiveLevel,
    joinedAt:           user.createdAt.toISOString(),
    lastActiveAt:       user.updatedAt.toISOString(),
    emailVerified:      true,
    notes:              undefined as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/users
// ---------------------------------------------------------------------------

export async function getUsers(req: Request, res: Response): Promise<void> {
  const parsed = UsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code:    'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join('; '),
      },
    });
    return;
  }

  const { search, role, status, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    ...(role   ? { role:   role   as never } : {}),
    ...(status ? { status: status as never } : {}),
    ...(search?.trim()
      ? {
          OR: [
            { email:       { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        email:       true,
        displayName: true,
        avatarUrl:   true,
        role:        true,
        status:      true,
        createdAt:   true,
        updatedAt:   true,
        readingProgress: {
          select: { status: true, lastReadAt: true },
        },
        _count: {
          select: {
            shelves:      true,
            aiActionLogs: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  type AdminUser = (typeof users)[number];
  res.json({
    data: {
      users: users.map((u: AdminUser) => {
        const stats = computeReadingStats(u.readingProgress);
        return serializeAdminUser({ ...u, ...stats });
      }),
      total,
      page,
      limit,
      hasMore: skip + users.length < total,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/users/:id
// ---------------------------------------------------------------------------

export async function getUserById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id:          true,
      email:       true,
      displayName: true,
      avatarUrl:   true,
      role:        true,
      status:      true,
      createdAt:   true,
      updatedAt:   true,
      readingProgress: {
        select: { status: true, lastReadAt: true },
      },
      _count: {
        select: {
          shelves:      true,
          aiActionLogs: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
    return;
  }

  const stats = computeReadingStats(user.readingProgress);
  res.json({ data: serializeAdminUser({ ...user, ...stats }), error: null });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/users/:id/status
// ---------------------------------------------------------------------------

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const parsed = UpdateStatusBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'status must be ACTIVE, SUSPENDED, or BANNED' },
    });
    return;
  }

  // Verify target user exists
  const target = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, role: true, status: true },
  });

  if (!target) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
    return;
  }

  // Admins cannot sanction other admins — prevents accidental lockouts
  if (target.role === 'ADMIN') {
    res.status(403).json({
      data: null,
      error: { code: 'FORBIDDEN', message: 'Cannot change the status of an Admin account' },
    });
    return;
  }

  const updated = await prisma.user.update({
    where:  { id },
    data:   { status: parsed.data.status as never },
    select: {
      id:          true,
      email:       true,
      displayName: true,
      avatarUrl:   true,
      role:        true,
      status:      true,
      createdAt:   true,
      updatedAt:   true,
      readingProgress: { select: { status: true, lastReadAt: true } },
      _count: {
        select: {
          shelves:      true,
          aiActionLogs: true,
        },
      },
    },
  });

  const stats = computeReadingStats(updated.readingProgress);
  res.json({ data: serializeAdminUser({ ...updated, ...stats }), error: null });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/users/:id/role
// Requires ADMIN role (not MODERATOR — only admins can promote users).
// ---------------------------------------------------------------------------

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  // Extra guard: only ADMIN can change roles (requireRole in the router allows
  // MODERATOR for other routes, so we enforce the stricter check here).
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      data: null,
      error: { code: 'FORBIDDEN', message: 'Only an Admin can change user roles' },
    });
    return;
  }

  const parsed = UpdateRoleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'role must be USER, VERIFIED_WRITER, MODERATOR, or ADMIN' },
    });
    return;
  }

  const target = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, role: true },
  });

  if (!target) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
    return;
  }

  const updated = await prisma.user.update({
    where:  { id },
    data:   { role: parsed.data.role as never },
    select: {
      id:          true,
      email:       true,
      displayName: true,
      avatarUrl:   true,
      role:        true,
      status:      true,
      createdAt:   true,
      updatedAt:   true,
      readingProgress: { select: { status: true, lastReadAt: true } },
      _count: {
        select: {
          shelves:      true,
          aiActionLogs: true,
        },
      },
    },
  });

  const stats = computeReadingStats(updated.readingProgress);
  res.json({ data: serializeAdminUser({ ...updated, ...stats }), error: null });
}

// ===========================================================================
// Feature Flags
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/v1/admin/feature-flags
// Returns all feature flags ordered by category then key.
// ---------------------------------------------------------------------------

export async function getFeatureFlags(req: Request, res: Response): Promise<void> {
  const flags = await prisma.featureFlag.findMany({
    orderBy: [
      { category: 'asc' },
      { key: 'asc' },
    ],
  });

  res.json({ data: flags, error: null });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/feature-flags/:key
// Updates an existing feature flag. Sets updatedById to the current admin.
// ---------------------------------------------------------------------------

export async function updateFeatureFlag(req: Request, res: Response): Promise<void> {
  const { key } = req.params as { key: string };

  const parsed = UpdateFeatureFlagBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code:    'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join('; '),
      },
    });
    return;
  }

  // Verify flag exists
  const existing = await prisma.featureFlag.findUnique({
    where: { key },
  });

  if (!existing) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: `Feature flag '${key}' not found` },
    });
    return;
  }

  // Update with the provided fields + set updatedById to track who made the change
  const updateData: {
    enabled?: boolean;
    rolloutPct?: number;
    name?: string;
    description?: string;
    updatedById: string;
  } = {
    updatedById: req.user.id,
  };

  if (parsed.data.enabled !== undefined) updateData.enabled = parsed.data.enabled;
  if (parsed.data.rolloutPct !== undefined) updateData.rolloutPct = parsed.data.rolloutPct;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const updated = await prisma.featureFlag.update({
    where: { key },
    data: updateData,
  });

  res.json({ data: updated, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/admin/feature-flags
// Creates a new feature flag. Key must be unique.
// ---------------------------------------------------------------------------

export async function createFeatureFlag(req: Request, res: Response): Promise<void> {
  const parsed = CreateFeatureFlagBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code:    'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join('; '),
      },
    });
    return;
  }

  // Check for duplicate key
  const existing = await prisma.featureFlag.findUnique({
    where: { key: parsed.data.key },
  });

  if (existing) {
    res.status(409).json({
      data: null,
      error: {
        code:    'DUPLICATE_KEY',
        message: `Feature flag with key '${parsed.data.key}' already exists`,
      },
    });
    return;
  }

  const created = await prisma.featureFlag.create({
    data: {
      key:         parsed.data.key,
      name:        parsed.data.name,
      description: parsed.data.description,
      category:    parsed.data.category as never,
      enabled:     parsed.data.enabled,
      rolloutPct:  parsed.data.rolloutPct,
      updatedById: req.user.id,
    },
  });

  res.status(201).json({ data: created, error: null });
}

// ===========================================================================
// Creator Applications
// ===========================================================================

const CreatorApplicationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('ALL'),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/creators/applications
// ---------------------------------------------------------------------------

export async function getCreatorApplications(req: Request, res: Response): Promise<void> {
  const parsed = CreatorApplicationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const { status, page, limit } = parsed.data;
  const skip  = (page - 1) * limit;
  const where = status !== 'ALL' ? { status: status as never } : {};

  const [applications, total] = await Promise.all([
    prisma.creatorApplication.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true } },
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.creatorApplication.count({ where }),
  ]);

  type CreatorApp = (typeof applications)[number];
  res.json({
    data: {
      applications: applications.map((a: CreatorApp) => ({
        id:             a.id,
        userId:         a.userId,
        applicantName:  a.applicantName,
        penName:        a.penName,
        email:          a.email,
        portfolioUrl:   a.portfolioUrl,
        sampleTitle:    a.sampleTitle,
        sampleSynopsis: a.sampleSynopsis,
        pitch:          a.pitch,
        primaryGenre:   a.primaryGenre,
        status:         a.status,
        submittedAt:    a.submittedAt.toISOString(),
        reviewedAt:     a.reviewedAt?.toISOString() ?? null,
        reviewedBy:     a.user?.displayName ?? null,
        user: {
          id:          a.user.id,
          email:       a.user.email,
          displayName: a.user.displayName,
          avatarUrl:   a.user.avatarUrl,
          role:        a.user.role,
        },
      })),
      total,
      page,
      limit,
      hasMore: skip + applications.length < total,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/creators/applications/:id/approve
// Sets status = APPROVED + upgrades user role to VERIFIED_WRITER in one transaction.
// ---------------------------------------------------------------------------

export async function approveCreatorApplication(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const application = await prisma.creatorApplication.findUnique({
    where:  { id },
    select: { id: true, status: true, userId: true },
  });

  if (!application) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    return;
  }

  if (application.status !== 'PENDING') {
    res.status(409).json({
      data: null,
      error: { code: 'CONFLICT', message: `Application is already ${application.status}` },
    });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.creatorApplication.update({
      where: { id },
      data:  { status: 'APPROVED', reviewedAt: new Date(), reviewedById: req.user.id },
      include: {
        user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true } },
      },
    }),
    prisma.user.update({
      where: { id: application.userId },
      data:  { role: 'VERIFIED_WRITER' },
    }),
  ]);

  res.json({
    data: {
      id:             updated.id,
      userId:         updated.userId,
      applicantName:  updated.applicantName,
      penName:        updated.penName,
      email:          updated.email,
      portfolioUrl:   updated.portfolioUrl,
      sampleTitle:    updated.sampleTitle,
      sampleSynopsis: updated.sampleSynopsis,
      pitch:          updated.pitch,
      primaryGenre:   updated.primaryGenre,
      status:         updated.status,
      submittedAt:    updated.submittedAt.toISOString(),
      reviewedAt:     updated.reviewedAt?.toISOString() ?? null,
      reviewedBy:     updated.user.displayName,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/creators/applications/:id/reject
// Sets status = REJECTED. Does NOT change user role.
// ---------------------------------------------------------------------------

export async function rejectCreatorApplication(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const application = await prisma.creatorApplication.findUnique({
    where:  { id },
    select: { id: true, status: true },
  });

  if (!application) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    return;
  }

  if (application.status !== 'PENDING') {
    res.status(409).json({
      data: null,
      error: { code: 'CONFLICT', message: `Application is already ${application.status}` },
    });
    return;
  }

  const updated = await prisma.creatorApplication.update({
    where: { id },
    data:  { status: 'REJECTED', reviewedAt: new Date(), reviewedById: req.user.id },
    include: {
      user: { select: { id: true, displayName: true } },
    },
  });

  res.json({
    data: {
      id:             updated.id,
      userId:         updated.userId,
      applicantName:  updated.applicantName,
      penName:        updated.penName,
      email:          updated.email,
      portfolioUrl:   updated.portfolioUrl,
      sampleTitle:    updated.sampleTitle,
      sampleSynopsis: updated.sampleSynopsis,
      pitch:          updated.pitch,
      primaryGenre:   updated.primaryGenre,
      status:         updated.status,
      submittedAt:    updated.submittedAt.toISOString(),
      reviewedAt:     updated.reviewedAt?.toISOString() ?? null,
      reviewedBy:     updated.user.displayName,
    },
    error: null,
  });
}

// ===========================================================================
// Story Moderation
// ===========================================================================

const ModerationStoriesQuerySchema = z.object({
  status: z.enum(['FLAGGED', 'APPROVED', 'QUARANTINED', 'ALL']).default('ALL'),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

const ModerationStatusBodySchema = z.object({
  status: z.enum(['FLAGGED', 'APPROVED', 'QUARANTINED']),
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/moderation/stories
// ---------------------------------------------------------------------------

export async function getModerationStories(req: Request, res: Response): Promise<void> {
  const parsed = ModerationStoriesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const { status, page, limit } = parsed.data;
  const skip  = (page - 1) * limit;
  const where = status !== 'ALL' ? { status: status as never } : {};

  const [stories, total] = await Promise.all([
    prisma.moderatedContent.findMany({
      where,
      include: {
        content: { select: { id: true, title: true, slug: true, type: true, synopsis: true } },
        author:  { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { reportedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.moderatedContent.count({ where }),
  ]);

  type ModStory = (typeof stories)[number];
  res.json({
    data: {
      stories: stories.map((s: ModStory) => ({
        id:             s.id,
        title:          s.content.title,
        authorName:     s.author.displayName,
        authorId:       s.authorId,
        flagReason:     s.flagReason,
        riskScore:      Math.round(s.riskScore),
        // wordCount and chapters come from the content relation — use synopsis length as proxy
        // since the schema stores bodyText at chapter level, not content level
        wordCount:      Math.round(s.riskScore * 50), // placeholder until chapter word counts aggregated
        chapters:       0, // populated in Sprint G when chapter aggregation is added
        status:         s.status,
        reportedAt:     s.reportedAt.toISOString(),
        excerptSnippet: s.content.synopsis ?? s.flagReason,
        contentId:      s.contentId,
        contentSlug:    s.content.slug,
        contentType:    s.content.type,
      })),
      total,
      page,
      limit,
      hasMore: skip + stories.length < total,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/moderation/stories/:id/status
// ---------------------------------------------------------------------------

export async function updateModerationStoryStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const parsed = ModerationStatusBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'status must be FLAGGED, APPROVED, or QUARANTINED' },
    });
    return;
  }

  const story = await prisma.moderatedContent.findUnique({
    where:  { id },
    select: { id: true, contentId: true, status: true },
  });

  if (!story) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Moderated content record not found' } });
    return;
  }

  const newStatus = parsed.data.status;

  // Run the moderation status update and the content visibility change in one transaction.
  // QUARANTINED → set Content.status = 'CANCELLED' (hides from public catalogue & reader)
  // APPROVED    → restore Content.status = 'ONGOING' if it was previously quarantine-cancelled
  // FLAGGED     → no change to Content.status (still visible while under review)
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.moderatedContent.update({
      where: { id },
      data:  { status: newStatus as never, reviewedAt: new Date(), reviewedById: req.user.id },
    });

    if (newStatus === 'QUARANTINED') {
      await tx.content.update({
        where: { id: story.contentId },
        data:  { status: 'CANCELLED' },
      });
    } else if (newStatus === 'APPROVED') {
      // Only restore visibility if the content was specifically CANCELLED by a prior quarantine.
      // Don't override a manually set COMPLETED/HIATUS status.
      const content = await tx.content.findUnique({
        where:  { id: story.contentId },
        select: { status: true },
      });
      if (content?.status === 'CANCELLED') {
        await tx.content.update({
          where: { id: story.contentId },
          data:  { status: 'ONGOING' },
        });
      }
    }
  });

  // Fetch the final state for the response
  const updated = await prisma.moderatedContent.findUnique({
    where: { id },
    include: {
      content: { select: { id: true, title: true, slug: true, type: true, synopsis: true, status: true } },
      author:  { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!updated) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Moderated content record not found after update' } });
    return;
  }

  res.json({
    data: {
      id:             updated.id,
      title:          updated.content.title,
      authorName:     updated.author.displayName,
      authorId:       updated.authorId,
      flagReason:     updated.flagReason,
      riskScore:      Math.round(updated.riskScore),
      wordCount:      Math.round(updated.riskScore * 50),
      chapters:       0,
      status:         updated.status,
      reportedAt:     updated.reportedAt.toISOString(),
      excerptSnippet: updated.content.synopsis ?? updated.flagReason,
      contentId:      updated.contentId,
      contentSlug:    updated.content.slug,
      contentType:    updated.content.type,
    },
    error: null,
  });
}

// ===========================================================================
// Dashboard Stats  (GET /api/v1/admin/stats)
// ===========================================================================

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalUsers,
    newUsersToday,
    newUsersYesterday,
    activeReadingToday,
    activeReadingYesterday,
    activeLiberChatsToday,
    activeLiberChatsYesterday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.readingProgress.count({ where: { lastReadAt: { gte: today } } }),
    prisma.readingProgress.count({ where: { lastReadAt: { gte: yesterday, lt: today } } }),
    // Count distinct users who triggered an AI action today
    prisma.aiActionLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: today } },
    }).then((rows: unknown[]) => rows.length),
    prisma.aiActionLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: yesterday, lt: today } },
    }).then((rows: unknown[]) => rows.length),
  ]);

  const pctChange = (current: number, previous: number): number =>
    previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100 * 10) / 10;

  res.json({
    data: {
      totalUsers,
      newUsersToday,
      totalUsersChange:       pctChange(newUsersToday, newUsersYesterday),
      dailyReadingHours:      Math.round(activeReadingToday * 1.5),
      dailyReadingHoursChange: pctChange(activeReadingToday, activeReadingYesterday),
      activeLiberChats:       activeLiberChatsToday,
      activeLiberChatsChange: pctChange(activeLiberChatsToday, activeLiberChatsYesterday),
      // Token cost not yet tracked in AiActionLog — returns 0 until tokensUsed field is added
      monthlyTokenCost:       0,
      monthlyTokenCostLimit:  1000,
    },
    error: null,
  });
}

// ===========================================================================
// Activity Stream  (GET /api/v1/admin/activity)
// ===========================================================================

export async function getAdminActivity(req: Request, res: Response): Promise<void> {
  const [recentAiLogs, recentUsers, recentApplications] = await Promise.all([
    prisma.aiActionLog.findMany({
      take:    15,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { displayName: true, email: true } } },
    }),
    prisma.user.findMany({
      take:    8,
      orderBy: { createdAt: 'desc' },
      select:  { id: true, displayName: true, email: true, createdAt: true },
    }),
    prisma.creatorApplication.findMany({
      take:    5,
      orderBy: { submittedAt: 'desc' },
      select:  { id: true, applicantName: true, penName: true, status: true, submittedAt: true },
    }),
  ]);

  type Severity = 'info' | 'success' | 'warning' | 'danger';
  type ActivityType = 'USER' | 'CREATOR' | 'SYSTEM' | 'FLAG' | 'CONTENT' | 'AI';

  interface ActivityItem {
    id:          string;
    timestamp:   string;
    title:       string;
    description: string;
    actor:       string;
    type:        ActivityType;
    severity:    Severity;
  }

  const activities: ActivityItem[] = [];

  // AI action log entries
  for (const log of recentAiLogs) {
    activities.push({
      id:          log.id,
      timestamp:   log.createdAt.toISOString(),
      title:       `Liber tool call: ${log.toolName}`,
      description: `AI companion executed ${log.toolName} in ${log.durationMs ?? '?'}ms`,
      actor:       log.user.displayName ?? log.user.email,
      type:        'AI',
      severity:    'info',
    });
  }

  // New user registrations
  for (const user of recentUsers) {
    activities.push({
      id:          `reg_${user.id}`,
      timestamp:   user.createdAt.toISOString(),
      title:       'New reader registration',
      description: `${user.displayName} joined Arcanium`,
      actor:       user.email,
      type:        'USER',
      severity:    'success',
    });
  }

  // Creator application events
  for (const app of recentApplications) {
    const severity: Severity =
      app.status === 'APPROVED' ? 'success' :
      app.status === 'REJECTED' ? 'danger'  : 'warning';
    activities.push({
      id:          `app_${app.id}`,
      timestamp:   app.submittedAt.toISOString(),
      title:       `Creator application ${app.status.toLowerCase()}`,
      description: `${app.applicantName} (${app.penName}) submitted a creator application`,
      actor:       app.applicantName,
      type:        'CREATOR',
      severity,
    });
  }

  // Sort newest-first
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    data: { activities: activities.slice(0, 25) },
    error: null,
  });
}

// ===========================================================================
// AI Analytics  (GET /api/v1/admin/ai/analytics)
// ===========================================================================

// Mood color palette — cycles through these for up to 5 top moods
const MOOD_COLORS = ['#8B5CF6', '#F59E0B', '#06B6D4', '#F43F5E', '#10B981'];

export async function getAiAnalytics(req: Request, res: Response): Promise<void> {
  const today        = new Date(); today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalActionsToday,
    latencyAgg,
    topMoods,
    dailyActions,
    activeChatUsers,
  ] = await Promise.all([
    prisma.aiActionLog.count({ where: { createdAt: { gte: today } } }),

    prisma.aiActionLog.aggregate({
      _avg: { durationMs: true },
      where: { durationMs: { not: null } },
    }),

    prisma.aiMoodEntry.groupBy({
      by:      ['mood'],
      where:   { createdAt: { gte: thirtyDaysAgo } },
      _count:  { mood: true },
      orderBy: { _count: { mood: 'desc' } },
      take:    5,
    }),

    // 7-day daily action counts via raw SQL
    prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "AiActionLog"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,

    // Active chat users today (distinct)
    prisma.aiActionLog.groupBy({
      by:    ['userId'],
      where: { createdAt: { gte: today } },
    }).then((rows: unknown[]) => rows.length),
  ]);

  // Mood stats with percentages and colors
  type MoodGroup = (typeof topMoods)[number];
  const totalMoodCount = topMoods.reduce((sum: number, m: MoodGroup) => sum + m._count.mood, 0) || 1;
  const moodStats = topMoods.map((m: MoodGroup, i: number) => ({
    id:              `mood_${i}`,
    mood:            m.mood,
    label:           m.mood,
    count:           m._count.mood,
    percentage:      Math.round((m._count.mood / totalMoodCount) * 100),
    color:           MOOD_COLORS[i] ?? '#8B5CF6',
    auraDescription: `Readers seeking ${m.mood.toLowerCase()} themed stories`,
  }));

  // Day-of-week labels for the 7-day chart
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const tokenHistory = (dailyActions as { date: string | Date; count: bigint | number }[]).map((row) => {
    const d     = new Date(row.date);
    const count = Number(row.count);
    return {
      date:         DAY_LABELS[d.getUTCDay()] ?? d.toLocaleDateString(),
      inputTokens:  count * 800,   // proxy: avg 800 input tokens per action
      outputTokens: count * 300,   // proxy: avg 300 output tokens per action
      // Cost not tracked — return 0 until tokensUsed field added to AiActionLog
      cost:         0,
    };
  });

  res.json({
    data: {
      totalTokensToday:  totalActionsToday * 1100, // proxy until real token counting
      monthlyCostUsd:    0,
      costLimitUsd:      1000,
      avgLatencyMs:      Math.round(latencyAgg._avg.durationMs ?? 0),
      satisfactionRate:  0,                        // placeholder until feedback model exists
      activeChatsCount:  activeChatUsers,
      topMoods:          moodStats,
      tokenHistory,
    },
    error: null,
  });
}

// ===========================================================================
// Scraper Management
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/v1/admin/scrapers
// Returns all ScraperConfig records enriched with live chapter-ingest stats.
// ---------------------------------------------------------------------------

export async function getScrapers(req: Request, res: Response): Promise<void> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const scrapers = await prisma.scraperConfig.findMany({
    orderBy: { name: 'asc' },
  });

  // Enrich sequentially — running all per-scraper queries in parallel exhausts
  // the Supabase connection pool (9 connections). Sequential is fine here since
  // scrapers are polled at most once per minute from the Dashboard/Content page.
  const enriched: object[] = [];
  for (const s of scrapers) {
    const domainFilter = s.targetDomain === '*'
      ? undefined
      : { sourceSite: { contains: s.targetDomain } };

    const isGeneric = s.targetDomain === '*';

    const contentCount = isGeneric
      ? await prisma.content.count()
      : await prisma.content.count({ where: { sourceSite: { contains: s.targetDomain } } });

    const recentChapters = isGeneric
      ? 0
      : await prisma.chapter.count({
          where: {
            createdAt: { gte: since24h },
            content:   { sourceSite: { contains: s.targetDomain } },
          },
        });

    const contentWithChapters = isGeneric
      ? await prisma.content.count({ where: { chapterCount: { gt: 0 } } })
      : await prisma.content.count({ where: { sourceSite: { contains: s.targetDomain }, chapterCount: { gt: 0 } } });

    const failedContent = isGeneric
      ? await prisma.content.count({ where: { chapterCount: 0 } })
      : await prisma.content.count({ where: { sourceSite: { contains: s.targetDomain }, chapterCount: 0 } });

    const successRate = contentCount === 0
      ? 0
      : Math.round((contentWithChapters / contentCount) * 1000) / 10;

    const status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED' =
      s.lastRunStatus === 'FAILED'   ? 'FAILED'   :
      s.lastRunStatus === 'DEGRADED' ? 'DEGRADED' : 'OPERATIONAL';

    enriched.push({
      id:                  s.id,
      name:                s.name,
      targetDomain:        s.targetDomain,
      status,
      latencyMs:           s.requestDelayMs,
      successRate,
      totalCrawledToday:   recentChapters,
      errorCount:          failedContent,
      lastRunAt:           s.lastRunAt ? relativeTimeFromNow(s.lastRunAt) : 'Never',
      selectorType:        s.selectorType,
      enabled:             s.enabled,
      requestDelayMs:      s.requestDelayMs,
      totalCrawledAllTime: s.totalCrawledAllTime,
    });
  }

  res.json({ data: enriched, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/admin/scrapers/:id/sync
// Queues refresh jobs for all content from this scraper's domain.
// ---------------------------------------------------------------------------

export async function syncScraper(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const scraper = await prisma.scraperConfig.findUnique({ where: { id } });
  if (!scraper) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Scraper config not found' },
    });
    return;
  }

  // Find all content items from this scraper's domain
  const domainFilter = scraper.targetDomain === '*'
    ? {}
    : { sourceSite: { contains: scraper.targetDomain } };

  const contentItems = await prisma.content.findMany({
    where:  domainFilter,
    select: { id: true, slug: true, sourceUrl: true, type: true },
    take:   50, // cap to avoid enormous queue bursts
  });

  // Update lastRunAt immediately
  await prisma.scraperConfig.update({
    where: { id },
    data:  { lastRunAt: new Date(), lastRunStatus: 'OPERATIONAL' },
  });

  // Re-run the full ingest pipeline for each content item from this domain.
  // ingestContent() uses upsert throughout so it safely discovers new chapters,
  // updates metadata, and re-queues body fetches for anything missing.
  // We do this fire-and-forget — respond immediately, process in background.
  let queued = 0;
  let errors = 0;

  const { ingestContent } = await import('../scraper/scraper.service.js');

  // Process sequentially to be polite to the source site
  for (const content of contentItems) {
    if (!content.sourceUrl) continue;
    try {
      const result = await ingestContent({ url: content.sourceUrl, type: content.type as never });
      queued += result.chaptersQueued;
    } catch (err) {
      errors++;
      console.warn(`[sync] Failed to re-ingest ${content.sourceUrl}:`, (err as Error).message);
    }
  }

  // Update totalCrawledAllTime and final status
  await prisma.scraperConfig.update({
    where: { id },
    data: {
      totalCrawledAllTime: { increment: queued },
      lastRunStatus: errors > 0 && queued === 0 ? 'FAILED' : errors > 0 ? 'DEGRADED' : 'OPERATIONAL',
    },
  });

  res.json({
    data: {
      contentScanned: contentItems.length,
      chaptersQueued: queued,
      errors,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Shared helper — relative time string for scraper lastRunAt
// ---------------------------------------------------------------------------

function relativeTimeFromNow(date: Date): string {
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ===========================================================================
// Content Delete  (DELETE /api/v1/admin/content/:id)
// ===========================================================================

export async function deleteContent(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const content = await prisma.content.findUnique({
    where:  { id },
    select: { id: true, title: true },
  });

  if (!content) {
    res.status(404).json({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Content not found' },
    });
    return;
  }

  // Cascade delete: chapters + related records are deleted via Prisma schema onDelete: Cascade
  await prisma.content.delete({ where: { id } });

  res.json({
    data:  { deleted: true, id, title: content.title },
    error: null,
  });
}

// ===========================================================================
// Category Taxonomy
// ===========================================================================

const CreateCategoryBodySchema = z.object({
  name:      z.string().min(1).max(100),
  genre:     z.string().min(1).max(100),
  sortOrder: z.coerce.number().int().min(0).default(0),
  enabled:   z.boolean().default(true),
});

const UpdateCategoryBodySchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  genre:     z.string().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  enabled:   z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/v1/categories   (PUBLIC — no auth required)
// Returns all enabled categories ordered by sortOrder.
// ---------------------------------------------------------------------------

export async function listCategories(req: Request, res: Response): Promise<void> {
  const categories = await prisma.category.findMany({
    where:   { enabled: true },
    orderBy: { sortOrder: 'asc' },
    select:  { id: true, name: true, genre: true, sortOrder: true },
  });
  res.json({ data: categories, error: null });
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/categories   (ADMIN/MODERATOR — includes disabled)
// ---------------------------------------------------------------------------

export async function adminListCategories(req: Request, res: Response): Promise<void> {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ data: categories, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/v1/admin/categories
// ---------------------------------------------------------------------------

export async function createCategory(req: Request, res: Response): Promise<void> {
  const parsed = CreateCategoryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  // Check uniqueness on both name and genre
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: parsed.data.name }, { genre: parsed.data.genre }] },
  });
  if (existing) {
    res.status(409).json({
      data: null,
      error: { code: 'DUPLICATE', message: `A category with that name or genre already exists` },
    });
    return;
  }

  const category = await prisma.category.create({ data: parsed.data });
  res.status(201).json({ data: category, error: null });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/categories/:id
// ---------------------------------------------------------------------------

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const parsed = UpdateCategoryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }

  const updateData: {
    name?: string;
    genre?: string;
    sortOrder?: number;
    enabled?: boolean;
  } = {};
  if (parsed.data.name      !== undefined) updateData.name      = parsed.data.name;
  if (parsed.data.genre     !== undefined) updateData.genre     = parsed.data.genre;
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;
  if (parsed.data.enabled   !== undefined) updateData.enabled   = parsed.data.enabled;

  const updated = await prisma.category.update({
    where: { id },
    data:  updateData,
  });
  res.json({ data: updated, error: null });
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/admin/categories/:id
// ---------------------------------------------------------------------------

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }

  await prisma.category.delete({ where: { id } });
  res.json({ data: { deleted: true, id }, error: null });
}

// ===========================================================================
// Content Metadata Update  (PATCH /api/v1/admin/content/:id)
// ===========================================================================

const UpdateContentMetaSchema = z.object({
  type:   z.enum(['WEB_NOVEL', 'LIGHT_NOVEL', 'COMIC', 'MANGA', 'EBOOK', 'WEBTOON']).optional(),
  genres: z.array(z.string().min(1).max(100)).optional(),
  title:  z.string().min(1).max(300).optional(),
  author: z.string().max(200).optional(),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UNKNOWN']).optional(),
});

export async function updateContentMeta(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const parsed = UpdateContentMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const existing = await prisma.content.findUnique({
    where:  { id },
    select: { id: true, metadata: true },
  });

  if (!existing) {
    res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Content not found' } });
    return;
  }

  // Merge genres into the existing metadata JSON
  const currentMeta = (existing.metadata ?? {}) as Record<string, unknown>;
  const updatedMeta = parsed.data.genres !== undefined
    ? { ...currentMeta, genres: parsed.data.genres }
    : currentMeta;

  const updateData: Record<string, unknown> = { metadata: updatedMeta };
  if (parsed.data.type   !== undefined) updateData['type']   = parsed.data.type;
  if (parsed.data.title  !== undefined) updateData['title']  = parsed.data.title;
  if (parsed.data.author !== undefined) updateData['author'] = parsed.data.author;
  if (parsed.data.status !== undefined) updateData['status'] = parsed.data.status;

  const updated = await prisma.content.update({
    where: { id },
    data:  updateData as never,
    select: {
      id: true, title: true, type: true, status: true,
      author: true, slug: true, metadata: true, chapterCount: true,
    },
  });

  res.json({ data: updated, error: null });
}

// ===========================================================================
// AI Config  (GET /api/v1/admin/ai/config  +  PUT /api/v1/admin/ai/config)
// ===========================================================================

const AI_CONFIG_KEY = 'ai_model';

export async function getAiConfig(req: Request, res: Response): Promise<void> {
  const row = await prisma.appConfig.findUnique({ where: { key: AI_CONFIG_KEY } });
  res.json({
    data: {
      model:     row?.value ?? env.AI_MODEL,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
      source:    row ? 'db' : 'env',
    },
    error: null,
  });
}

const UpdateAiConfigSchema = z.object({
  model: z.string().min(1).max(200),
});

export async function updateAiConfig(req: Request, res: Response): Promise<void> {
  const parsed = UpdateAiConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data:  null,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
    });
    return;
  }

  const userId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;
  const row = await prisma.appConfig.upsert({
    where:  { key: AI_CONFIG_KEY },
    update: { value: parsed.data.model, updatedBy: userId },
    create: { key: AI_CONFIG_KEY, value: parsed.data.model, updatedBy: userId },
  });

  res.json({
    data: { model: row.value, updatedAt: row.updatedAt, updatedBy: row.updatedBy, source: 'db' },
    error: null,
  });
}

// ===========================================================================
// BADGE / HONOR MANAGEMENT
// ===========================================================================

const BadgeUpsertSchema = z.object({
  key:          z.string().min(1).max(80).regex(/^[a-z0-9_]+$/, 'key must be snake_case'),
  title:        z.string().min(1).max(120),
  description:  z.string().min(1).max(500),
  iconName:     z.string().min(1).max(60),
  colorClasses: z.string().min(1).max(300),
  tier:         z.string().min(1).max(60),
  criteria:     z.string().max(300).optional(),
  manualOnly:   z.boolean().optional(),
  enabled:      z.boolean().optional(),
  sortOrder:    z.coerce.number().int().optional(),
});

const AwardBadgeSchema = z.object({
  userId:  z.string().cuid(),
  badgeId: z.string().cuid(),
  note:    z.string().max(300).optional(),
});

// ── GET /api/v1/admin/badges ────────────────────────────────────────────────
export async function listBadges(req: Request, res: Response): Promise<void> {
  const badges = await prisma.badge.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { awards: true } } },
  });
  res.json({ data: badges, error: null });
}

// ── POST /api/v1/admin/badges ───────────────────────────────────────────────
export async function createBadge(req: Request, res: Response): Promise<void> {
  const parsed = BadgeUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const existing = await prisma.badge.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    res.status(409).json({ data: null, error: { code: 'CONFLICT', message: `Badge key "${parsed.data.key}" already exists` } });
    return;
  }
  const { criteria, manualOnly, enabled, sortOrder, ...rest } = parsed.data;
  const badge = await prisma.badge.create({
    data: {
      ...rest,
      criteria:   criteria   ?? null,
      manualOnly: manualOnly ?? false,
      enabled:    enabled    ?? true,
      sortOrder:  sortOrder  ?? 0,
    },
  });
  res.status(201).json({ data: badge, error: null });
}

// ── PATCH /api/v1/admin/badges/:id ─────────────────────────────────────────
export async function updateBadge(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const parsed = BadgeUpsertSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const { criteria, ...rest } = parsed.data;
  const updateData = { ...rest, ...(criteria !== undefined ? { criteria: criteria ?? null } : {}) };
  const badge = await prisma.badge.update({ where: { id }, data: updateData as never }).catch(() => null);
  if (!badge) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Badge not found' } }); return; }
  res.json({ data: badge, error: null });
}

// ── DELETE /api/v1/admin/badges/:id ────────────────────────────────────────
export async function deleteBadge(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await prisma.badge.delete({ where: { id } }).catch(() => null);
  res.json({ data: { deleted: true, id }, error: null });
}

// ── GET /api/v1/admin/badges/:id/awards ────────────────────────────────────
// All users who have been awarded this badge
export async function listBadgeAwards(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const awards = await prisma.userBadgeAward.findMany({
    where: { badgeId: id },
    include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } },
    orderBy: { awardedAt: 'desc' },
  });
  res.json({ data: awards, error: null });
}

// ── GET /api/v1/admin/users/:id/badges ─────────────────────────────────────
// All badge awards for one user (both manual + which computed ones apply)
export async function listUserBadges(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const awards = await prisma.userBadgeAward.findMany({
    where: { userId: id },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' },
  });
  res.json({ data: awards, error: null });
}

// ── POST /api/v1/admin/badges/award ────────────────────────────────────────
export async function awardBadge(req: Request, res: Response): Promise<void> {
  const parsed = AwardBadgeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const adminId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;
  const award = await prisma.userBadgeAward.upsert({
    where:  { userId_badgeId: { userId: parsed.data.userId, badgeId: parsed.data.badgeId } },
    update: { awardedBy: adminId, note: parsed.data.note ?? null },
    create: { userId: parsed.data.userId, badgeId: parsed.data.badgeId, awardedBy: adminId, note: parsed.data.note ?? null },
    include: { badge: true, user: { select: { id: true, displayName: true, email: true } } },
  });
  res.status(201).json({ data: award, error: null });
}

// ── DELETE /api/v1/admin/badges/award ──────────────────────────────────────
export async function revokeBadge(req: Request, res: Response): Promise<void> {
  const { userId, badgeId } = req.body as { userId?: string; badgeId?: string };
  if (!userId || !badgeId) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'userId and badgeId are required' } });
    return;
  }
  await prisma.userBadgeAward.deleteMany({ where: { userId, badgeId } });
  res.json({ data: { revoked: true, userId, badgeId }, error: null });
}

// ── POST /api/v1/admin/badges/seed-defaults ─────────────────────────────────
// Idempotent — seeds the 8 built-in badge definitions if they don't exist yet.
export async function seedDefaultBadges(req: Request, res: Response): Promise<void> {
  const defaults = [
    { key: 'night_owl',          title: 'Night Owl Archivist',      description: 'Read after midnight for 7 consecutive days',               iconName: 'Moon',     colorClasses: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',   tier: 'Bronze Talisman', sortOrder: 0 },
    { key: 'constellation_keeper',title: 'Keeper of Constellations', description: 'Finished 5 cosmological tomes and astronomical logs',       iconName: 'Sparkles', colorClasses: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60', tier: 'Silver Talisman', sortOrder: 1 },
    { key: 'liber_companion',    title: 'Companion of Liber',        description: 'Conversed with Liber 25 times regarding archive manuscripts',iconName: 'BookOpen', colorClasses: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',         tier: 'Gold Talisman',   sortOrder: 2 },
    { key: 'master_cartographer',title: 'Master Cartographer',       description: 'Charted 10 ancient scrolls in the Great Cartography',       iconName: 'Compass',  colorClasses: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60', tier: 'Bronze Talisman', sortOrder: 3 },
    { key: 'scribe_of_tomes',    title: 'Scribe of Tomes',           description: 'Shared 20 marginalia reflections across community circles',  iconName: 'Scroll',   colorClasses: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',         tier: 'Silver Talisman', sortOrder: 4 },
    { key: 'century_reader',     title: 'Century Reader',            description: 'Read 100 hours in the archive',                              iconName: 'Clock',    colorClasses: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',    tier: 'Silver Talisman', sortOrder: 5 },
    { key: 'archival_warden',    title: 'Archival Warden',           description: 'Verified 50 community citations and references',             iconName: 'Shield',   colorClasses: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',    tier: 'Gold Talisman',   sortOrder: 6 },
    { key: 'legendary_scholar',  title: 'Legendary Scholar',         description: 'Attain rank 5 master archivist credentials in Arcanium',    iconName: 'Award',    colorClasses: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',    tier: 'Legendary',       sortOrder: 7 },
  ];

  let seeded = 0;
  for (const d of defaults) {
    const existing = await prisma.badge.findUnique({ where: { key: d.key } });
    if (!existing) {
      await prisma.badge.create({ data: d });
      seeded++;
    }
  }
  res.json({ data: { seeded, total: defaults.length }, error: null });
}

// ===========================================================================
// FEATURED CONTENT CURATION
// ===========================================================================

const PinContentSchema = z.object({
  sectionKey: z.string().min(1).max(80),
  label:      z.string().min(1).max(120),
  contentId:  z.string().cuid(),
  sortOrder:  z.coerce.number().int().optional(),
});

const CONTENT_SELECT = {
  id: true, title: true, slug: true, type: true, status: true,
  synopsis: true, coverImageUrl: true, rating: true,
  chapterCount: true, author: true, sourceSite: true, metadata: true,
} as const;

// ── GET /api/v1/admin/featured ──────────────────────────────────────────────
// All sections including disabled ones — admin view
export async function adminListFeatured(req: Request, res: Response): Promise<void> {
  const rows = await prisma.featuredSection.findMany({
    orderBy: [{ key: 'asc' }, { sortOrder: 'asc' }],
    include: { content: { select: CONTENT_SELECT } },
  });
  res.json({ data: rows, error: null });
}

// ── POST /api/v1/admin/featured ─────────────────────────────────────────────
// Pin a content item to a section (upsert — re-pin updates sortOrder/label)
export async function pinContent(req: Request, res: Response): Promise<void> {
  const parsed = PinContentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
    return;
  }
  const adminId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;
  const { sectionKey, label, contentId, sortOrder } = parsed.data;

  const row = await prisma.featuredSection.upsert({
    where:  { key_contentId: { key: sectionKey, contentId } },
    update: { label, sortOrder: sortOrder ?? 0, enabled: true, pinnedBy: adminId },
    create: { key: sectionKey, label, contentId, sortOrder: sortOrder ?? 0, pinnedBy: adminId },
    include: { content: { select: CONTENT_SELECT } },
  });
  res.status(201).json({ data: row, error: null });
}

// ── DELETE /api/v1/admin/featured/:id ──────────────────────────────────────
export async function unpinContent(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await prisma.featuredSection.delete({ where: { id } }).catch(() => null);
  res.json({ data: { unpinned: true, id }, error: null });
}

// ── PATCH /api/v1/admin/featured/:id ───────────────────────────────────────
// Toggle enabled / update sortOrder
export async function updateFeaturedPin(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { enabled, sortOrder, label } = req.body as {
    enabled?: boolean; sortOrder?: number; label?: string;
  };
  const data: Record<string, unknown> = {};
  if (enabled   !== undefined) data['enabled']   = enabled;
  if (sortOrder !== undefined) data['sortOrder']  = sortOrder;
  if (label     !== undefined) data['label']      = label;

  const row = await prisma.featuredSection.update({
    where: { id },
    data:  data as never,
    include: { content: { select: CONTENT_SELECT } },
  }).catch(() => null);

  if (!row) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Pin not found' } }); return; }
  res.json({ data: row, error: null });
}
