import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emails = [
  'lyra.starlight@astral.space',
  'kael.shadows@void.xyz',
  'dev@arcanium.local',
  'sol.vance@arcanium.local',
  'mira.ashford@arcanium.local',
  'finn.warden@archive.io',
  'eris.poet@echo.com',
  'talia.alchemist@potion.dev',
];

for (const email of emails) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, displayName: true } });
  console.log(user ? `✓ ${email} → ${user.displayName}` : `✗ ${email} MISSING`);
}

const circles = await prisma.readingCircle.findMany({ select: { id: true, name: true, ownerId: true } });
console.log(`\n${circles.length} circles in DB:`);
circles.forEach(c => console.log(`  - ${c.name} | owner: ${c.ownerId}`));

await prisma.$disconnect();
