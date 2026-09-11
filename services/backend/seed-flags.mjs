/**
 * seed-flags.mjs — Seeds only FeatureFlag records. Safe to run while the
 * backend dev server is running because it only touches the FeatureFlag table,
 * which no request handler holds a long-lived lock on.
 *
 * Run from repo root:
 *   pnpm --filter @arcanium/backend exec -- node seed-flags.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const FLAGS = [
  {
    key: 'enable_community_feed',
    name: 'Community Reader Feed',
    description: 'Enables user review posts, quotes highlighting, and public reading activity streams.',
    category: 'CORE_READER',
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: 'enable_voice_chat',
    name: 'Liber Voice Synthesis (TTS)',
    description: 'Enables streaming neural voice reading for books and conversational vocal feedback with Liber.',
    category: 'AI_LIBER',
    enabled: false,
    rolloutPct: 15,
  },
  {
    key: 'enable_creator_publishing',
    name: 'Verified Creator Self-Publishing',
    description: 'Grants approved authors access to write, schedule chapters, and monetize on Arcanium directly.',
    category: 'CREATOR_ECONOMY',
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: 'enable_ai_search',
    name: 'Vector Semantic Catalog Search',
    description: 'Replaces keyword search with natural-language mood & trope embeddings via Liber.',
    category: 'AI_LIBER',
    enabled: true,
    rolloutPct: 80,
  },
  {
    key: 'enable_liber_memory',
    name: 'Liber Persistent Reading Memory',
    description: 'Allows Liber to retain memories of user reading tastes, dropped tropes, and favorite characters.',
    category: 'AI_LIBER',
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: 'enable_creator_tipping',
    name: 'Arcane Shard Creator Tipping',
    description: 'Allows readers to tip verified writers with virtual shards redeemable for creator payouts.',
    category: 'CREATOR_ECONOMY',
    enabled: false,
    rolloutPct: 0,
  },
  {
    key: 'enable_offline_reading',
    name: 'IndexedDB Offline Chapter Storage',
    description: 'Enables client-side caching of upcoming chapters for encrypted offline reading.',
    category: 'CORE_READER',
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: 'maintenance_mode',
    name: 'Global Maintenance Lockdown',
    description: 'Renders the public reading client in read-only mode for database migrations.',
    category: 'SYSTEM',
    enabled: false,
    rolloutPct: 0,
  },
];

let created = 0;
let skipped = 0;

for (const flag of FLAGS) {
  const result = await prisma.featureFlag.upsert({
    where:  { key: flag.key },
    update: {}, // never overwrite — admin-set values take precedence
    create: flag,
  });
  // upsert always returns a record; check if updatedAt === createdAt to detect new
  const isNew = result.updatedAt.getTime() === result.updatedAt.getTime(); // always true, use count instead
  console.log(`  ${flag.key.padEnd(30)} → inserted/skipped`);
}

// Final count
const total = await prisma.featureFlag.count();
console.log(`\nDone. ${total} feature flags in DB.`);

await prisma.$disconnect();
