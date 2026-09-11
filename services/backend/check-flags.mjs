import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const flags = await prisma.featureFlag.findMany({
  orderBy: [{ category: 'asc' }, { key: 'asc' }],
});

if (flags.length === 0) {
  console.log('No feature flags in DB yet.');
} else {
  console.log(`${flags.length} feature flags in DB:`);
  console.table(flags.map(f => ({
    key:       f.key,
    category:  f.category,
    enabled:   f.enabled,
    rollout:   f.rolloutPct + '%',
  })));
}

await prisma.$disconnect();
