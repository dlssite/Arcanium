/**
 * MangaDex parser — https://api.mangadex.org (REST API v5)
 *
 * Uses the official MangaDex REST API — no HTML scraping needed.
 * Returns image CDN URLs as chapter bodyText (JSON array of strings).
 * The reader renders these as a vertical image scroll stack.
 */

import type { Parser, ContentMetadata, ChapterRef } from './types.js';

const API = 'https://api.mangadex.org';
const CDN = 'https://uploads.mangadex.org';

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

export const mangaDexParser: Parser = {
  canHandle(url: string) {
    return url.includes('mangadex.org');
  },

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const mangaId = extractMangaId(url);

    const data = await apiFetch<{
      data: {
        attributes: {
          title: Record<string, string>;
          description: Record<string, string>;
          status: string;
          tags: Array<{ attributes: { name: Record<string, string>; group: string } }>;
          altTitles: Array<Record<string, string>>;
        };
        relationships: Array<{ type: string; attributes?: { name?: string; fileName?: string } }>;
      };
    }>(`/manga/${mangaId}?includes[]=author&includes[]=artist&includes[]=cover_art`);

    const attrs = data.data.attributes;
    const title = attrs.title['en'] ?? Object.values(attrs.title)[0] ?? 'Unknown';
    const synopsis = attrs.description['en'] ?? Object.values(attrs.description)[0] ?? null;

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
      ongoing: 'ONGOING',
      completed: 'COMPLETED',
      hiatus: 'HIATUS',
      cancelled: 'UNKNOWN',
    };

    return {
      title,
      author: authorRel?.attributes?.name ?? null,
      artist: artistRel?.attributes?.name ?? null,
      synopsis,
      coverImageUrl,
      sourceSite: 'mangadex.org',
      language: 'en',
      genres,
      tags,
      status: statusMap[attrs.status] ?? 'UNKNOWN',
      type: 'MANGA',
    };
  },

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const mangaId = extractMangaId(url);
    const chapters: ChapterRef[] = [];

    // Try English first, fall back to all languages if none found
    const langFilters = ['&translatedLanguage[]=en', ''];

    for (const langFilter of langFilters) {
      let offset = 0;
      const limit = 100;
      chapters.length = 0; // reset for each attempt

      while (true) {
        const data = await apiFetch<{
          data: Array<{
            id: string;
            attributes: {
              chapter: string | null;
              title: string | null;
              publishAt: string | null;
              volume: string | null;
              translatedLanguage: string;
            };
          }>;
          total: number;
        }>(
          `/manga/${mangaId}/feed?limit=${limit}&offset=${offset}${langFilter}&order[chapter]=asc`,
        );

        for (const ch of data.data) {
          const num = parseFloat(ch.attributes.chapter ?? '') || chapters.length + 1;
          // Avoid duplicate chapter numbers (different scanlations of same chapter)
          if (chapters.some((c) => c.number === num)) continue;
          chapters.push({
            number: num,
            title: ch.attributes.title,
            url: `${API}/at-home/server/${ch.id}`,
            publishedAt: ch.attributes.publishAt ? new Date(ch.attributes.publishAt) : null,
          });
        }

        if (offset + limit >= data.total) break;
        offset += limit;
      }

      // If we found chapters with this language filter, stop trying
      if (chapters.length > 0) break;
    }

    // Sort by chapter number ascending
    return chapters.sort((a, b) => a.number - b.number);
  },

  async extractChapterBody(atHomeUrl: string): Promise<string> {
    // atHomeUrl is the /at-home/server/:chapterId endpoint
    const data = await apiFetch<{
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    }>(atHomeUrl.replace(API, ''));

    const imageUrls = data.chapter.data.map(
      (file) => `${data.baseUrl}/data/${data.chapter.hash}/${file}`,
    );

    // Store image URLs as JSON — ChapterContent.tsx renders these as an image stack
    return JSON.stringify(imageUrls);
  },
};
