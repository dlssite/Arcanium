/**
 * Provider barrel — re-exports all ContentProvider implementations and the
 * shared interface types. Import from here instead of individual files.
 */

export { ContentProvider }   from './ContentProvider.js';
export type { ContentMetadata, ChapterRef } from './ContentProvider.js';

export { MangaDexProvider }     from './MangaDexProvider.js';
export { OpenLibraryProvider }  from './OpenLibraryProvider.js';
export { RSSFeedProvider }      from './RSSFeedProvider.js';
export { WebScraperProvider, RobotsDisallowedError } from './WebScraperProvider.js';
