/**
 * seed-categories.mjs — Seeds the Category taxonomy table.
 *
 * Each category has:
 *   name  — display label shown in the web app filter chips
 *   genre — exact string matched against Content.metadata.genres[]
 *           so ?genre=Fantasy filters correctly with no extra mapping
 *
 * Run:  pnpm --filter @arcanium/backend exec -- node seed-categories.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const CATEGORIES = [
  // ── Genres actually present in the DB (from real scraped content) ─────────
  { name: 'Action',       genre: 'Action',       sortOrder: 0  },
  { name: 'Adventure',    genre: 'Adventure',    sortOrder: 1  },
  { name: 'Fantasy',      genre: 'Fantasy',      sortOrder: 2  },
  { name: 'Romance',      genre: 'Romance',      sortOrder: 3  },
  { name: 'Mystery',      genre: 'Mystery',      sortOrder: 4  },
  { name: 'Horror',       genre: 'Horror',       sortOrder: 5  },
  { name: 'Comedy',       genre: 'Comedy',       sortOrder: 6  },
  { name: 'Drama',        genre: 'Drama',        sortOrder: 7  },
  { name: 'Sci-Fi',       genre: 'Sci-Fi',       sortOrder: 8  },
  { name: 'Psychological',genre: 'Psychological',sortOrder: 9  },
  { name: 'Slice of Life',genre: 'Slice of Life',sortOrder: 10 },
  { name: 'Philosophical',genre: 'Philosophical',sortOrder: 11 },
  { name: 'Tragedy',      genre: 'Tragedy',      sortOrder: 12 },
  { name: 'Girls\' Love', genre: 'Girls\' Love', sortOrder: 13 },
  // ── Common genres expected from future ingests (Royal Road / MangaDex) ────
  { name: 'Dark Fantasy', genre: 'Dark Fantasy', sortOrder: 14 },
  { name: 'LitRPG',       genre: 'LitRPG',       sortOrder: 15 },
  { name: 'Isekai',       genre: 'Isekai',        sortOrder: 16 },
  { name: 'Progression',  genre: 'Progression',  sortOrder: 17 },
  { name: 'Time Loop',    genre: 'Time Loop',     sortOrder: 18 },
  { name: 'Cultivation',  genre: 'Cultivation',  sortOrder: 19 },
];

let created = 0;
let skipped = 0;

for (const cat of CATEGORIES) {
  const existing = await prisma.category.findUnique({ where: { genre: cat.genre } });
  if (existing) {
    skipped++;
    console.log(`  skip  ${cat.genre}`);
  } else {
    await prisma.category.create({ data: cat });
    created++;
    console.log(`  +     ${cat.genre}`);
  }
}

const total = await prisma.category.count();
console.log(`\nDone. Created ${created}, skipped ${skipped}. Total: ${total} categories.`);

await prisma.$disconnect();
