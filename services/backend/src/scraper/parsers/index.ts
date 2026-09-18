/**
 * Provider Registry — replaces the old flat PARSERS array.
 *
 * Instantiates every ContentProvider once at module load and exposes
 * getProvider(url) which returns the first provider whose canHandle()
 * returns true. WebScraperProvider is always last (canHandle = true).
 *
 * Legacy compatibility: the old Parser interface and getParser() name are
 * re-exported so callers that haven't been migrated yet keep compiling.
 */

import { ContentProvider }        from '../../providers/ContentProvider.js';
import { AO3Provider }           from '../../providers/AO3Provider.js';
import { AsuraScansProvider }    from '../../providers/AsuraScansProvider.js';
import { ComicKProvider }        from '../../providers/ComicKProvider.js';
import { GutenbergProvider }     from '../../providers/GutenbergProvider.js';
import { MangaDexProvider }      from '../../providers/MangaDexProvider.js';
import { NovelUpdatesProvider }  from '../../providers/NovelUpdatesProvider.js';
import { OpenLibraryProvider }   from '../../providers/OpenLibraryProvider.js';
import { RSSFeedProvider }       from '../../providers/RSSFeedProvider.js';
import { TapasProvider }         from '../../providers/TapasProvider.js';
import { WattpadProvider }       from '../../providers/WattpadProvider.js';
import { WebtoonProvider }       from '../../providers/WebtoonProvider.js';
import { WebScraperProvider }    from '../../providers/WebScraperProvider.js';

export type { ContentMetadata, ChapterRef } from '../../providers/ContentProvider.js';
export { ContentProvider }                  from '../../providers/ContentProvider.js';

// ---------------------------------------------------------------------------
// Registry — order matters: specific providers must precede the fallback.
// ---------------------------------------------------------------------------

// Not `as const` — we want a mutable ContentProvider[] so the return type
// is ContentProvider, not a union of specific subtypes that may be undefined.
const PROVIDERS: ContentProvider[] = [
  new AO3Provider(),           // archiveofourown.org — fan fiction (10M+ works)
  new AsuraScansProvider(),    // asuracomic.net — manhwa scanlations
  new ComicKProvider(),        // comick.io — manga/manhwa/webtoon aggregator (100k+)
  new GutenbergProvider(),     // gutenberg.org — public domain classics (70k+)
  new MangaDexProvider(),      // mangadex.org — manga REST API
  new NovelUpdatesProvider(),  // novelupdates.com — light novel tracker (40k+)
  new OpenLibraryProvider(),   // openlibrary.org — public domain books
  new TapasProvider(),         // tapas.io — western webcomics and novels (8k+)
  new WebtoonProvider(),       // webtoons.com — official Naver webtoons
  new WattpadProvider(),       // wattpad.com — user-generated web novels
  new RSSFeedProvider(),       // any /feed, /rss, /atom URL — web serials
  new WebScraperProvider(),    // MUST be last — canHandle() always returns true
];

/**
 * Returns the first provider that can handle the given URL.
 * Always returns at least WebScraperProvider (the catch-all fallback).
 */
export function getProvider(url: string): ContentProvider {
  for (const provider of PROVIDERS) {
    if (provider.canHandle(url)) return provider;
  }
  // Unreachable — WebScraperProvider always matches — but satisfies TS
  return new WebScraperProvider();
}

/**
 * @deprecated Use getProvider(). Kept for backward compatibility with
 * scraperQueue.ts and scraper.service.ts until those callers are updated.
 */
export const getParser = getProvider;

// ---------------------------------------------------------------------------
// Legacy Parser interface shim — scraperQueue.ts imports this type
// ---------------------------------------------------------------------------

/** @deprecated Extend ContentProvider instead. */
export interface Parser {
  canHandle(url: string): boolean;
  extractMetadata(url: string): Promise<import('../../providers/ContentProvider.js').ContentMetadata>;
  extractChapterList(url: string): Promise<import('../../providers/ContentProvider.js').ChapterRef[]>;
  extractChapterBody(chapterUrl: string): Promise<string>;
}
