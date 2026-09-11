/**
 * MangaDexProvider — https://api.mangadex.org (REST API v5)
 *
 * Refactored from mangadex.parser.ts into the ContentProvider class hierarchy.
 * Uses the official MangaDex REST API — no HTML scraping.
 * Returns image CDN URLs as a JSON-stringified string[] for bodyText.
 *
 * isImageType() always returns true — the queue and chapter route use this
 * to skip DB caching and set contentMode: 'image' on responses.
 */

import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';

const API = 'https://api.mangadex.org';
const CDN = 'https://uploads.mangadex.org';

// ---------------------------------------------------------------------------
// Internal API helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'User-Agent': 'ArcaniumBot/1.0 (contact@arcanium.app)' },
  });
  if (!res.ok) throw new Error(`MangaDex API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

/** Extract the MangaDex UUID from a URL like https://mangadex.org/title/UUID/slug */
function extractMangaId(url: string): string {
  const match = url.match(/mangadex\.org\/title\/([0-9a-f-]{36})/i);
  if (!match?.[1]) throw new Error(`Cannot extract MangaDex manga ID from: ${url}`);
  return match[1];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class MangaDexProvider extends ContentProvider {
  canHandle(url: string): boolean {
    return url.includes('mangadex.org');
  }

  /** Image-based content — always true for MangaDex. */
  override isImageType(): boolean {
    return true;
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const mangaId = extractMangaId(url);

    const data = await apiFetch<{
      data: {
        attributes: {
          title: Record<string, string>;
          description: Record<string, string>;
          status: string;
          tags: Array<{ attributes: { name: Record<string, string>; group: string } }>;
        };
        relationships: Array<{
          type: string;
          attributes?: { name?: string; fileName?: string };
        }>;
      };
    }>(`/manga/${mangaId}?includes[]=author&includes[]=artist&includes[]=cover_art`);

    const attrs = data.data.attributes;
    const title = attrs.title['en'] ?? Object.values(attrs.title)[0] ?? 'Unknown';
    const synopsis =
      attrs.description['en'] ?? Object.values(attrs.description)[0] ?? null;

    const authorRel = data.data.relationships.find((r) => r.type === 'author');
    const artistRel = data.data.relationships.find((r) => r.type === 'artist');
    const coverRel  = data.data.relationships.find((r) => r.type === 'cover_art');

    const coverFileName = coverRel?.attributes?.fileName;
    const coverImageUrl = coverFileName
      ? `${CDN}/covers/${mangaId}/${coverFileName}`
      : null;

    const genres = attrs.tags
      .filter((t) => t.attributes.group === 'genre')
      .map((t) => t.attributes.name['en'] ?? Object.values(t.attributes.name)[0] ?? '')
      .filter((g): g is string => g.length > 0)
      .slice(0, 5);

    const tags = attrs.tags
      .map((t) => t.attributes.name['en'] ?? Object.values(t.attributes.name)[0] ?? '')
      .filter((t): t is string => t.length > 0);

    const statusMap: Record<string, ContentMetadata['status']> = {
      ongoing:   'ONGOING',
      completed: 'COMPLETED',
      hiatus:    'HIATUS',
      cancelled: 'UNKNOWN',
    };

    return {
      title,
      author:        authorRel?.attributes?.name ?? null,
      artist:        artistRel?.attributes?.name ?? null,
      synopsis,
      coverImageUrl,
      sourceSite:    'mangadex.org',
      language:      'en',
      genres,
      tags,
      status:        statusMap[attrs.status] ?? 'UNKNOWN',
      type:          'MANGA',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const mangaId = extractMangaId(url);
    const chapters: ChapterRef[] = [];

    // Try English first, fall back to all languages if none found
    const langFilters = ['&translatedLanguage[]=en', ''];

    for (const langFilter of langFilters) {
      let offset = 0;
      const limit  = 100;
      chapters.length = 0; // reset for each attempt

      while (true) {
        const data = await apiFetch<{
          data: Array<{
            id: string;
            attributes: {
              chapter:            string | null;
              title:              string | null;
              publishAt:          string | null;
              translatedLanguage: string;
            };
          }>;
          total: number;
        }>(
          `/manga/${mangaId}/feed?limit=${limit}&offset=${offset}${langFilter}&order[chapter]=asc`,
        );

        for (const ch of data.data) {
          const num = parseFloat(ch.attributes.chapter ?? '') || chapters.length + 1;
          // Skip duplicate chapter numbers from different scanlation groups
          if (chapters.some((c) => c.number === num)) continue;
          chapters.push({
            number:      num,
            title:       ch.attributes.title,
            url:         `${API}/at-home/server/${ch.id}`,
            publishedAt: ch.attributes.publishAt
              ? new Date(ch.attributes.publishAt)
              : null,
          });
        }

        if (offset + limit >= data.total) break;
        offset += limit;
      }

      if (chapters.length > 0) break; // found chapters — stop trying language filters
    }

    return chapters.sort((a, b) => a.number - b.number);
  }

  /**
   * Fetches fresh CDN image URLs from the MangaDex at-home server.
   * Returns a JSON-stringified string[] — never cached in the DB because
   * CDN URLs expire in ~15 minutes.
   */
  async extractChapterBody(atHomeUrl: string): Promise<string> {
    const path = atHomeUrl.replace(API, '');
    const data = await apiFetch<{
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    }>(path);

    // Prefer full-quality `data` pages; fall back to `dataSaver` if `data` is empty
    // (some chapters are only uploaded in data-saver format).
    const pages = data.chapter.data.length > 0
      ? data.chapter.data
      : data.chapter.dataSaver;

    if (pages.length === 0) {
      throw new Error(`No image pages found for chapter: ${atHomeUrl}`);
    }

    const quality = data.chapter.data.length > 0 ? 'data' : 'data-saver';
    const imageUrls = pages.map(
      (file) => `${data.baseUrl}/${quality}/${data.chapter.hash}/${file}`,
    );

    return JSON.stringify(imageUrls);
  }
}
