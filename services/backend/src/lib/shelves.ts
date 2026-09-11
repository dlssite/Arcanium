import { prisma } from './prisma.js';

const DEFAULT_SHELVES = [
  'Reading',
  'Completed',
  'On Hold',
  'Dropped',
  'Plan to Read',
];

/**
 * Idempotently create the 5 default system shelves for a user.
 * Safe to call on every login — upsert ensures no duplicates.
 */
export async function ensureDefaultShelves(userId: string): Promise<void> {
  await Promise.all(
    DEFAULT_SHELVES.map((name, index) =>
      prisma.shelf.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name, isDefault: true, sortOrder: index },
      }),
    ),
  );
}
