import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });
const prisma = new PrismaClient();
const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
console.log(`${cats.length} categories:`);
cats.forEach((c) => console.log(` ${c.sortOrder.toString().padStart(2)}. ${c.name} → "${c.genre}"`));
await prisma.$disconnect();
