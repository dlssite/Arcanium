/**
 * ContentProvider — abstract base class for all ingestion providers.
 *
 * Every provider must implement four methods that cover the full ingestion
 * lifecycle: detection, metadata extraction, chapter discovery, and body
 * retrieval. The shapes returned must be compatible with the Prisma Content
 * and Chapter models and the frontend ContentSchema / ChapterDetailSchema
 * contracts in @arcanium/types.
 *
 * Naming convention: one class per file, filename = <Name>Provider.ts
 */

// ---------------------------------------------------------------------------
// Shared value types (replaces parsers/types.ts — kept backward-compatible)
// ---------------------------------------------------------------------------

/**
 * Subset of the Prisma Content model that a provider can populate.
 * All fields are optional so providers only need to fill what they know.
 */
export interface ContentMetadata {
  title: string;
  author: string | null;
  artist: string | null;
  synopsis: string | null;
  coverImageUrl: string | null;
  sourceSite: string;
  language: string;
  genres: string[];
  tags: string[];
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'UNKNOWN';
  type: 'WEB_NOVEL' | 'LIGHT_NOVEL' | 'COMIC' | 'MANGA' | 'EBOOK' | 'WEBTOON';
}

/**
 * A lightweight reference to a chapter used during the ingest chapter-list
 * step. Only `url` is required for subsequent body extraction.
 */
export interface ChapterRef {
  number: number;
  title: string | null;
  /** The URL / API endpoint that `extractChapterBody` will be called with. */
  url: string;
  publishedAt: Date | null;
}

// ---------------------------------------------------------------------------
// ContentProvider abstract base
// ---------------------------------------------------------------------------

/**
 * Abstract base class that all content providers must extend.
 *
 * Design notes:
 * - `canHandle` is a *fast* synchronous check — no I/O, no network calls.
 * - `extractMetadata` should return a `Partial<ContentMetadata>` merged with
 *   sensible defaults, not throw on missing fields.
 * - `extractChapterBody` MUST return:
 *     • Sanitized HTML string for text content (WEB_NOVEL / EBOOK / etc.)
 *     • JSON.stringify'd string[] of image URLs for image content (MANGA / COMIC / WEBTOON)
 * - Providers are stateless — instantiated once at startup and reused.
 */
export abstract class ContentProvider {
  /**
   * Return `true` if this provider can handle the given URL.
   * Called synchronously in the hot path — keep it O(1).
   */
  abstract canHandle(url: string): boolean;

  /**
   * Fetch and return catalogue-level metadata for the series at `url`.
   * Must not throw for expected "missing field" situations — return null
   * for optional fields instead.
   */
  abstract extractMetadata(url: string): Promise<ContentMetadata>;

  /**
   * Return an ordered list of chapter references for the series at `url`.
   * Each `ChapterRef.url` will later be passed to `extractChapterBody`.
   */
  abstract extractChapterList(url: string): Promise<ChapterRef[]>;

  /**
   * Fetch and return the full body of a single chapter.
   *
   * Text content  → sanitized HTML string
   * Image content → JSON.stringify(string[]) of CDN image URLs
   *
   * L5 compliance: All HTML output MUST be passed through sanitize-html
   * before being returned. Image-URL arrays are safe by construction.
   */
  abstract extractChapterBody(sourceUrl: string): Promise<string>;

  /**
   * Convenience helper — returns true if the provider's content type is
   * image-based (MANGA / COMIC / WEBTOON). Used by the queue and routes
   * to branch caching / contentMode logic without re-inspecting bodyText.
   *
   * Providers that serve multiple types should override this and inspect
   * the URL or a cached metadata flag.
   */
  isImageType(): boolean {
    return false;
  }
}
