import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const rows = await prisma.content.findMany({ select: { metadata: true }, take: 100 });
const genres = new Set();
for (const r of rows) {
  const g = r.metadata?.genres;
  if (Array.isArray(g)) g.forEach((x) => genres.add(x));
}

console.log(`\n${genres.size} unique genres in DB:\n`);
[...genres].sort().forEach((g) => console.log(' •', g));

await prisma.$disconnect();
