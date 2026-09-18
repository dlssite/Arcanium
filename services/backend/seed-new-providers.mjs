/**
 * seed-new-providers.mjs — Seeds ScraperConfig records for newly added providers.
 * Tests all 7 new providers added in Phase 1.
 *
 * Run:  pnpm --filter @arcanium/backend exec -- node seed-new-providers.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const NEW_SCRAPERS = [
  // 1. ComicK - Manga/Manhwa/Webtoon aggregator (REST API)
  {
    name:           'ComicK Aggregator',
    targetDomain:   'comick.io',
    selectorType:   'REST',
    enabled:        true,
    requestDelayMs: 800,
  },
  {
    name:           'ComicK App Mirror',
    targetDomain:   'comick.app',
    selectorType:   'REST',
    enabled:        true,
    requestDelayMs: 800,
  },
  
  // 2. AsuraScans - Manhwa scanlations (HTML)
  {
    name:           'Asura Scans Manhwa',
    targetDomain:   'asuracomic.net',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1500,
  },
  {
    name:           'Asura Scans Mirror',
    targetDomain:   'asurascans.com',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1500,
  },
  
  // 3. Archive of Our Own - Fan fiction (HTML)
  {
    name:           'AO3 Fan Fiction Archive',
    targetDomain:   'archiveofourown.org',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1200,
  },
  
  // 4. Webtoon - Official Naver webtoons (HTML)
  {
    name:           'Naver WEBTOON Official',
    targetDomain:   'webtoons.com',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1000,
  },
  
  // 5. NovelUpdates - Light novel tracker (HTML)
  {
    name:           'NovelUpdates Tracker',
    targetDomain:   'novelupdates.com',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1500,
  },
  
  // 6. Project Gutenberg - Public domain classics (HTML)
  {
    name:           'Project Gutenberg Archive',
    targetDomain:   'gutenberg.org',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1000,
  },
  
  // 7. Tapas - Western webcomics and novels (HTML)
  {
    name:           'Tapas Comics & Novels',
    targetDomain:   'tapas.io',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1200,
  },
];

console.log('🌱 Seeding new provider configurations...\n');

for (const cfg of NEW_SCRAPERS) {
  await prisma.scraperConfig.upsert({
    where:  { targetDomain: cfg.targetDomain },
    update: {
      name:           cfg.name,
      selectorType:   cfg.selectorType,
      enabled:        cfg.enabled,
      requestDelayMs: cfg.requestDelayMs,
    },
    create: cfg,
  });
  console.log(`  ✅ ${cfg.targetDomain.padEnd(25)} → ${cfg.name}`);
}

const total = await prisma.scraperConfig.count();
console.log(`\n✨ Done! ${total} total scraper configs in database.`);
console.log('\n📊 New providers ready for testing:\n');
console.log('  • ComicK (comick.io) - 100k+ manga/manhwa/webtoons');
console.log('  • AsuraScans (asuracomic.net) - Popular manhwa scanlations');
console.log('  • AO3 (archiveofourown.org) - 10M+ fan fiction works');
console.log('  • Webtoon (webtoons.com) - Official Naver webtoons');
console.log('  • NovelUpdates (novelupdates.com) - 40k+ light novels');
console.log('  • Gutenberg (gutenberg.org) - 70k+ classics');
console.log('  • Tapas (tapas.io) - 8k+ western comics & novels');

await prisma.$disconnect();
