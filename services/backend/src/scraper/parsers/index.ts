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

import { ContentProvider }     from '../../providers/ContentProvider.js';
import { MangaDexProvider }    from '../../providers/MangaDexProvider.js';
import { OpenLibraryProvider } from '../../providers/OpenLibraryProvider.js';
import { RSSFeedProvider }     from '../../providers/RSSFeedProvider.js';
import { WattpadProvider }     from '../../providers/WattpadProvider.js';
import { WebScraperProvider }  from '../../providers/WebScraperProvider.js';

export type { ContentMetadata, ChapterRef } from '../../providers/ContentProvider.js';
export { ContentProvider }                  from '../../providers/ContentProvider.js';

// ---------------------------------------------------------------------------
// Registry — order matters: specific providers must precede the fallback.
// ---------------------------------------------------------------------------

// Not `as const` — we want a mutable ContentProvider[] so the return type
// is ContentProvider, not a union of specific subtypes that may be undefined.
const PROVIDERS: ContentProvider[] = [
  new MangaDexProvider(),    // mangadex.org — REST API, image content
  new OpenLibraryProvider(), // openlibrary.org — REST API, public-domain books
  new WattpadProvider(),     // wattpad.com — web novels, user-generated stories
  new RSSFeedProvider(),     // any /feed, /rss, /atom URL — web serials
  new WebScraperProvider(),  // MUST be last — canHandle() always returns true
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
