import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const flag = await prisma.featureFlag.upsert({
  where:  { key: 'FEATURE_FLAG_CIRCLES' },
  update: { enabled: true, rolloutPct: 100 },
  create: {
    key:         'FEATURE_FLAG_CIRCLES',
    name:        'Reading Circles',
    description: 'Enables the Reading Circles community feature.',
    category:    'CORE_READER',
    enabled:     true,
    rolloutPct:  100,
  },
});

console.log(`FEATURE_FLAG_CIRCLES → enabled: ${flag.enabled}, rolloutPct: ${flag.rolloutPct}`);
await prisma.$disconnect();
