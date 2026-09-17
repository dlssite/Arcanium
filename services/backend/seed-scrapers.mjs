/**
 * seed-scrapers.mjs — Seeds ScraperConfig records.
 * Safe to run while the backend dev server is running.
 *
 * Run:  pnpm --filter @arcanium/backend exec -- node seed-scrapers.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const SCRAPERS = [
  {
    name:           'Royal Road Ingestion Engine',
    targetDomain:   'royalroad.com',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1500,
  },
  {
    name:           'Wattpad Story Scraper',
    targetDomain:   'wattpad.com',
    selectorType:   'CHEERIO',
    enabled:        true,
    requestDelayMs: 1200,
  },
  {
    name:           'MangaDex API Connector',
    targetDomain:   'mangadex.org',
    selectorType:   'REST',
    enabled:        true,
    requestDelayMs: 500,
  },
  {
    name:           'Open Library API Bridge',
    targetDomain:   'openlibrary.org',
    selectorType:   'REST',
    enabled:        true,
    requestDelayMs: 800,
  },
  {
    name:           'Generic Readability Fallback',
    targetDomain:   '*',
    selectorType:   'READABILITY',
    enabled:        true,
    requestDelayMs: 2000,
  },
];

for (const cfg of SCRAPERS) {
  await prisma.scraperConfig.upsert({
    where:  { targetDomain: cfg.targetDomain },
    update: {},
    create: cfg,
  });
  console.log(`  ${cfg.targetDomain.padEnd(20)} → upserted`);
}

const total = await prisma.scraperConfig.count();
console.log(`\nDone. ${total} scraper configs in DB.`);

await prisma.$disconnect();
