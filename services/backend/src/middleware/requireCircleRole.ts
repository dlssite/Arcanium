import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

// Extend the Express Request type to carry the resolved circle membership
declare global {
  namespace Express {
    interface Request {
      circleMembership?: {
        memberId: string;
        role: 'OWNER' | 'MODERATOR' | 'MEMBER';
        status: 'ACTIVE' | 'PENDING' | 'BANNED';
      } | null;
    }
  }
}

/**
 * Resolves the requesting user's CircleMember row for the circleId in
 * req.params and attaches it to req.circleMembership.
 *
 * Must be used after authenticate().
 * Used by requireCircleOwner / requireCircleMod / requireCircleMember below.
 *
 * ADMINs bypass membership checks entirely — they always pass.
 */
async function resolveCircleMembership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // ADMINs have full access — skip DB lookup
  if (req.user?.role === 'ADMIN') {
    req.circleMembership = { memberId: '', role: 'OWNER', status: 'ACTIVE' };
    next();
    return;
  }

  const circleId = req.params['circleId'] ?? req.params['id'];
  if (!circleId) {
    res.status(400).json({
      data: null,
      error: { code: 'BAD_REQUEST', message: 'circleId is required' },
    });
    return;
  }

  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: req.user.id } },
    select: { id: true, role: true, status: true },
  });

  req.circleMembership = membership
    ? { memberId: membership.id, role: membership.role as 'OWNER' | 'MODERATOR' | 'MEMBER', status: membership.status as 'ACTIVE' | 'PENDING' | 'BANNED' }
    : null;

  next();
}

/**
 * requireCircleOwner — only the circle OWNER (or ADMIN) may proceed.
 */
export function requireCircleOwner(req: Request, res: Response, next: NextFunction): void {
  void resolveCircleMembership(req, res, () => {
    const m = req.circleMembership;
    if (!m || (m.role !== 'OWNER' && req.user?.role !== 'ADMIN')) {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'Only the circle owner can perform this action' },
      });
      return;
    }
    next();
  });
}

/**
 * requireCircleMod — OWNER, MODERATOR, or ADMIN may proceed.
 */
export function requireCircleMod(req: Request, res: Response, next: NextFunction): void {
  void resolveCircleMembership(req, res, () => {
    const m = req.circleMembership;
    const role = m?.role;
    if (!m || (role !== 'OWNER' && role !== 'MODERATOR' && req.user?.role !== 'ADMIN')) {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'Only circle moderators or owners can perform this action' },
      });
      return;
    }
    next();
  });
}

/**
 * requireCircleMember — any ACTIVE member (MEMBER, MODERATOR, OWNER, or ADMIN) may proceed.
 */
export function requireCircleMember(req: Request, res: Response, next: NextFunction): void {
  void resolveCircleMembership(req, res, () => {
    const m = req.circleMembership;
    if (!m || m.status !== 'ACTIVE') {
      res.status(403).json({
        data: null,
        error: { code: 'FORBIDDEN', message: 'You must be an active circle member to perform this action' },
      });
      return;
    }
    next();
  });
}

/**
 * resolveCircleMembershipMiddleware — attaches req.circleMembership without
 * blocking. Used on routes that conditionally change behaviour based on membership
 * (e.g. circle detail: non-members see preview, members see full data).
 */
export { resolveCircleMembership as resolveCircleMembershipMiddleware };
