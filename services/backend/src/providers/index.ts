/**
 * Provider barrel — re-exports all ContentProvider implementations and the
 * shared interface types. Import from here instead of individual files.
 */

export { ContentProvider }   from './ContentProvider.js';
export type { ContentMetadata, ChapterRef } from './ContentProvider.js';

export { AO3Provider }          from './AO3Provider.js';
export { AsuraScansProvider }   from './AsuraScansProvider.js';
export { ComicKProvider }       from './ComicKProvider.js';
export { GutenbergProvider }    from './GutenbergProvider.js';
export { MangaDexProvider }     from './MangaDexProvider.js';
export { NovelUpdatesProvider } from './NovelUpdatesProvider.js';
export { OpenLibraryProvider }  from './OpenLibraryProvider.js';
export { RSSFeedProvider }      from './RSSFeedProvider.js';
export { TapasProvider }        from './TapasProvider.js';
export { WattpadProvider }      from './WattpadProvider.js';
export { WebtoonProvider }      from './WebtoonProvider.js';
export { WebScraperProvider, RobotsDisallowedError } from './WebScraperProvider.js';
