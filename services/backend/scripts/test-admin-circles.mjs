import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test exactly what adminListCircles does
const where = { isArchived: false };

const [circles, total] = await Promise.all([
  prisma.readingCircle.findMany({
    where,
    include: {
      _count:   { select: { members: true, posts: true } },
      sessions: {
        where:   { isActive: true },
        select:  { id: true, bookTitle: true, activeNow: true, isActive: true, startedAt: true, endedAt: true },
        take:    1,
      },
      owner: { select: { displayName: true } },
    },
    orderBy: [{ isFeatured: 'desc' }, { featuredOrder: 'asc' }, { createdAt: 'desc' }],
    take: 20,
  }),
  prisma.readingCircle.count({ where }),
]);

console.log(`Total circles: ${total}`);
circles.forEach(c => {
  console.log(`  - ${c.name} | owner: ${c.owner?.displayName ?? 'NULL'} | members: ${c._count.members} | posts: ${c._count.posts} | session: ${c.sessions[0]?.bookTitle ?? 'none'}`);
});

await prisma.$disconnect();
