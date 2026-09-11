
/**
 * reseed.mjs — Wipe all content and seed a fresh multi-provider catalogue
 *
 * Exercises every active ingestion provider:
 *   WebScraperProvider  — Royal Road (Cheerio + robots.txt + sanitize-html)
 *   MangaDexProvider    — MangaDex REST API v5
 *   OpenLibraryProvider — Open Library REST API (public-domain books)
 *   RSSFeedProvider     — WordPress /feed/ (The Wandering Inn)
 *
 * Content sections:
 *   WEB_NOVEL    (4) — Royal Road / WebScraper
 *   LIGHT_NOVEL  (2) — Royal Road / WebScraper
 *   MANGA        (4) — MangaDex API
 *   MANHWA       (2) — MangaDex API  (stored as MANGA type — same renderer)
 *   WEBTOON      (2) — MangaDex API
 *   COMIC        (2) — MangaDex API
 *   EBOOK        (2) — Open Library API  ← NEW
 *   WEB_NOVEL    (1) — RSS Feed          ← NEW (The Wandering Inn via /feed/)
 *
 * Run from repo root:  node reseed.mjs
 * Requires backend on  http://localhost:4000
 * Dev credentials:     dev@arcanium.local / devpassword123
 */

const BASE = 'http://localhost:4000';
let TOKEN  = '';

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

/**
 * Ingest a single URL.
 * On rate-limit (429) waits 15 s then retries once.
 * All other errors are logged and the script continues cleanly.
 */
async function ingest(url, type, label) {
  process.stdout.write(`  ${label} ... `);
  try {
    const r = await api('/api/v1/admin/content/ingest', {
      method: 'POST',
      body:   JSON.stringify({ url, type }),
    });

    // Retry once on rate-limit
    if (r.status === 429) {
      process.stdout.write('rate-limited, waiting 15 s ... ');
      await new Promise(resolve => setTimeout(resolve, 15_000));
      return ingest(url, type, '↩ retry');
    }

    if (r.error) {
      console.log(`FAILED — ${r.error.message}`);
      return null;
    }

    console.log(`OK — "${r.data.title}" (${r.data.chaptersFound} chapters)`);
    return r.data;
  } catch (e) {
    console.log(`ERROR — ${e.message}`);
    return null;
  }
}

/** Small delay to be polite to external APIs between ingests. */
const pause = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Arcanium — Multi-Provider Reseed Script v2      ║');
  console.log('║  Providers: WebScraper · MangaDex · OpenLib · RSS ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── 1. Health check ───────────────────────────────────────────────────────
  const health = await api('/api/v1/health');
  if (health.data?.status !== 'ok') {
    console.error('✗ Backend not reachable. Run: pnpm --filter @arcanium/backend dev');
    process.exit(1);
  }
  console.log('✓ Backend healthy\n');

  // ── 2. Login ──────────────────────────────────────────────────────────────
  const login = await api('/api/v1/auth/login', {
    method: 'POST',
    body:   JSON.stringify({ email: 'dev@arcanium.local', password: 'devpassword123' }),
  });
  if (!login.data?.accessToken) {
    console.error('✗ Login failed:', login.error?.message);
    process.exit(1);
  }
  TOKEN = login.data.accessToken;
  console.log('✓ Logged in as ADMIN\n');

  // ── 3. Wipe ───────────────────────────────────────────────────────────────
  console.log('--- Wiping existing catalogue ---');
  const wipe = await api('/api/v1/admin/content/wipe', { method: 'DELETE' });
  if (wipe.error) {
    console.error('✗ Wipe failed:', wipe.error.message);
    process.exit(1);
  }
  console.log(`✓ Deleted ${wipe.data.deleted} content records\n`);

  // ── 4. Ingest by provider ─────────────────────────────────────────────────

  // ── WebScraper — Royal Road ───────────────────────────────────────────────
  console.log('═══ WEB_NOVEL · WebScraper (Royal Road) ═══');
  await ingest(
    'https://www.royalroad.com/fiction/21220/mother-of-learning',
    'WEB_NOVEL', 'Mother of Learning — Fantasy / Time Loop',
  );
  await pause(1500);
  await ingest(
    'https://www.royalroad.com/fiction/36049/the-primal-hunter',
    'WEB_NOVEL', 'The Primal Hunter — LitRPG / Action',
  );
  await pause(1500);
  await ingest(
    'https://www.royalroad.com/fiction/25225/he-who-fights-with-monsters',
    'WEB_NOVEL', 'He Who Fights With Monsters — Progression / Fantasy',
  );
  await pause(1500);
  await ingest(
    'https://www.royalroad.com/fiction/11209/dungeon-crawler-carl',
    'WEB_NOVEL', 'Dungeon Crawler Carl — Action / Comedy',
  );

  // ── WebScraper — Royal Road long-form / Light Novel ───────────────────────
  console.log('\n═══ LIGHT_NOVEL · WebScraper (Royal Road) ═══');
  await pause(1500);
  await ingest(
    'https://www.royalroad.com/fiction/20073/the-earth-is-online',
    'LIGHT_NOVEL', 'The Earth Is Online — Sci-Fi / Thriller',
  );
  await pause(1500);
  await ingest(
    'https://www.royalroad.com/fiction/29701/cradle',
    'LIGHT_NOVEL', 'Cradle (Unsouled) — Progression / Cultivation',
  );

  // ── MangaDex Provider — MANGA ─────────────────────────────────────────────
  // UUIDs verified against https://api.mangadex.org/manga?title=<name>&limit=1
  console.log('\n═══ MANGA · MangaDex API ═══');
  await ingest(
    'https://mangadex.org/title/b0b721ff-c388-4486-aa0f-c2b0bb321512',
    'MANGA', "Frieren: Beyond Journey's End — Slice of Life / Adventure",
  );
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/801513ba-a712-498c-8f57-cae55b38cc92',
    'MANGA', 'Berserk — Dark Fantasy / Action',
  );
  await pause(1000);
  // Verified UUID: api.mangadex.org/manga?title=spy+x+family → 6b958848-c885-4735-9201-12ee77abcb3c
  await ingest(
    'https://mangadex.org/title/6b958848-c885-4735-9201-12ee77abcb3c',
    'MANGA', 'SPY×FAMILY — Comedy / Action',
  );
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/b9797c5b-642e-44d9-ac40-8b31b9ae110a',
    'MANGA', 'Delicious in Dungeon — Fantasy / Cooking',
  );

  // ── MangaDex Provider — MANHWA (Korean, stored as MANGA type) ─────────────
  // Verified UUID: api.mangadex.org/manga?title=omniscient+reader → 9a414441-bbad-43f1-a3a7-dc262ca790a3
  console.log('\n═══ MANHWA · MangaDex API (stored as MANGA) ═══');
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
    'MANGA', 'Solo Leveling — Action / Fantasy',
  );
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/9a414441-bbad-43f1-a3a7-dc262ca790a3',
    'MANGA', "Omniscient Reader's Viewpoint — Action / Psychological",
  );

  // ── MangaDex Provider — WEBTOON ───────────────────────────────────────────
  // Verified UUID: api.mangadex.org/manga?title=tower+of+god&offset=2 → c0ee660b-f9f2-45c3-8068-5123ff53f84a
  // Verified UUID: api.mangadex.org/manga?title=noblesse → f61952ad-63bb-4e81-a03e-9e50b9e23037
  console.log('\n═══ WEBTOON · MangaDex API ═══');
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/c0ee660b-f9f2-45c3-8068-5123ff53f84a',
    'WEBTOON', 'Tower of God — Action / Fantasy',
  );
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/f61952ad-63bb-4e81-a03e-9e50b9e23037',
    'WEBTOON', 'Noblesse — Action / Supernatural',
  );

  // ── MangaDex Provider — COMIC ─────────────────────────────────────────────
  // Verified UUID: api.mangadex.org/manga?title=girls+last+tour → 5b93fa0f-0640-49b8-974e-954b9959929b
  console.log('\n═══ COMIC · MangaDex API ═══');
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/5b93fa0f-0640-49b8-974e-954b9959929b',
    'COMIC', "Girls' Last Tour — Post-Apocalyptic / Slice of Life",
  );
  await pause(1000);
  await ingest(
    'https://mangadex.org/title/76ee7069-23b4-493c-bc44-34ccbf3051a8',
    'COMIC', 'A Silent Voice — Drama / Romance',
  );

  // ── Open Library Provider — EBOOK ─────────────────────────────────────────
  // Verifying work IDs via the Open Library search API:
  //   Frankenstein (Mary Shelley)   → /works/OL450063W
  //   Pride and Prejudice (Austen)  → /works/OL66554W
  console.log('\n═══ EBOOK · Open Library API (public domain) ═══');
  await ingest(
    'https://openlibrary.org/works/OL450063W',
    'EBOOK', 'Frankenstein — Mary Shelley (Open Library)',
  );
  await pause(1000);
  await ingest(
    'https://openlibrary.org/works/OL66554W',
    'EBOOK', 'Pride and Prejudice — Jane Austen (Open Library)',
  );

  // ── RSS Feed Provider — WEB_NOVEL ─────────────────────────────────────────
  // The Wandering Inn is a major WordPress-hosted web serial.
  // WordPress exposes a standard RSS feed at /feed/ out of the box.
  // The RSSFeedProvider detects this via the /feed/ path pattern.
  console.log('\n═══ WEB_NOVEL · RSS Feed Provider ═══');
  await ingest(
    'https://wanderinginn.com/feed/',
    'WEB_NOVEL', 'The Wandering Inn — RSS feed (wanderinginn.com)',
  );

  // ── 5. Final catalogue summary ────────────────────────────────────────────
  console.log('\n═══ Final Catalogue Summary ═══');
  const cat   = await api('/api/v1/content?limit=50&page=1');
  const items = cat.data?.items ?? [];

  // Group by type for a clean printout
  const byType = {};
  for (const item of items) {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  }

  // Tally provider sources from sourceSite
  const providerMap = {
    'royalroad.com':  'WebScraper (RR)',
    'mangadex.org':   'MangaDex API',
    'openlibrary.org':'OpenLibrary API',
  };

  let ingested  = 0;
  let failed    = 0;
  for (const [type, list] of Object.entries(byType)) {
    console.log(`\n  [${type}] — ${list.length} title(s)`);
    for (const item of list) {
      const provider = providerMap[item.sourceSite] ?? (item.sourceSite ? `RSS (${item.sourceSite})` : 'unknown');
      const chapters = item.chapterCount > 0 ? `${item.chapterCount} ch` : 'queued';
      console.log(`    • ${item.title.padEnd(45)} ${chapters.padStart(8)}  [${provider}]`);
      ingested++;
    }
  }

  // Provider coverage report
  const coverageMap = {
    'WebScraper (Royal Road)': items.filter(i => i.sourceSite === 'royalroad.com').length,
    'MangaDex API':            items.filter(i => i.sourceSite === 'mangadex.org').length,
    'Open Library API':        items.filter(i => i.sourceSite === 'openlibrary.org').length,
    'RSS Feed':                items.filter(i => i.sourceSite && !['royalroad.com','mangadex.org','openlibrary.org'].includes(i.sourceSite)).length,
  };

  const expected = { 'WebScraper (Royal Road)': 6, 'MangaDex API': 8, 'Open Library API': 2, 'RSS Feed': 1 };
  const total    = Object.values(expected).reduce((a, b) => a + b, 0);

  console.log('\n  Provider Coverage:');
  for (const [provider, count] of Object.entries(coverageMap)) {
    const exp    = expected[provider] ?? '?';
    const status = count >= exp ? '✓' : count > 0 ? '⚠' : '✗';
    console.log(`    ${status}  ${provider.padEnd(30)} ${count} / ${exp}`);
    if (count < exp) failed += (exp - count);
  }

  console.log(`\n  Total: ${ingested} ingested, ${failed} failed / partial`);

  // Quick reader test URLs
  console.log('\n  Sample reader URLs:');
  const testCandidates = [
    items.find(i => i.type === 'WEB_NOVEL'   && i.chapterCount > 0),
    items.find(i => i.type === 'MANGA'        && i.chapterCount > 0),
    items.find(i => i.type === 'EBOOK'        && i.chapterCount > 0),
    items.find(i => i.sourceSite && !['royalroad.com','mangadex.org','openlibrary.org'].includes(i.sourceSite)),
  ].filter(Boolean);

  for (const item of testCandidates) {
    console.log(`    ${item.type.padEnd(12)}  http://localhost:3000/read/${item.slug}/1`);
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Done! Open http://localhost:3000 to test.       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

run().catch(e => {
  console.error('\nFatal error:', e.message);
  process.exit(1);
});
