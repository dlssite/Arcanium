
/**
 * OpenLibraryProvider — https://openlibrary.org (REST API)
 *
 * Handles Open Library book URLs of the forms:
 *   https://openlibrary.org/works/OL123W
 *   https://openlibrary.org/books/OL123M
 *
 * Uses the Open Library Read API to expose public-domain plaintext chapters.
 * Books without full-text access return a single stub chapter directing the
 * reader to the Open Library page.
 *
 * API docs: https://openlibrary.org/developers/api
 */

import sanitizeHtml from 'sanitize-html';
import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';

const OL_BASE    = 'https://openlibrary.org';
const COVERS_CDN = 'https://covers.openlibrary.org';
const UA         = 'ArcaniumBot/1.0 (contact@arcanium.app)';

// Reuse a tight HTML allowlist — same philosophy as WebScraperProvider
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'div', 'span',
  ],
  allowedAttributes: { '*': ['class'] },
  allowedSchemes: [],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract the OL key from a URL, e.g. /works/OL123W or /books/OL456M */
function extractOlKey(url: string): string {
  const match = url.match(/\/(works|books)\/(OL\w+)/i);
  if (!match) throw new Error(`Cannot extract Open Library key from: ${url}`);
  return `/${match[1]}/${match[2]}`;
}

async function olFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${OL_BASE}${path}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000), // 15s — OL can be slow
  });
  if (!res.ok) throw new Error(`Open Library API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

/** Convert a work key to an edition OLID for the Read API. */
async function getEditionId(workKey: string): Promise<string | null> {
  try {
    const data = await olFetch<{ entries?: Array<{ key: string }> }>(
      `${workKey}/editions.json?limit=1`,
    );
    const first = data.entries?.[0]?.key;
    if (!first) return null;
    // /books/OL123M → OL123M
    return first.split('/').pop() ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class OpenLibraryProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      const { hostname, pathname } = new URL(url);
      return (
        hostname.includes('openlibrary.org') &&
        (pathname.startsWith('/works/') || pathname.startsWith('/books/'))
      );
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const key  = extractOlKey(url);
    const path = key.startsWith('/books/') ? `${key}.json` : `${key}.json`;

    const data = await olFetch<{
      title:           string;
      description?:    string | { value: string };
      covers?:         number[];
      authors?:        Array<{ author?: { key: string }; key?: string }>;
      subjects?:       string[];
      subject_places?: string[];
    }>(path);

    // Author names require a separate lookup
    let author: string | null = null;
    const authorRef = data.authors?.[0];
    if (authorRef) {
      const authorKey = authorRef.author?.key ?? authorRef.key ?? null;
      if (authorKey) {
        try {
          const authorData = await olFetch<{ name?: string; personal_name?: string }>(
            `${authorKey}.json`,
          );
          author = authorData.personal_name ?? authorData.name ?? null;
        } catch { /* non-fatal */ }
      }
    }

    const synopsis =
      typeof data.description === 'string'
        ? data.description
        : data.description?.value ?? null;

    const coverId      = data.covers?.[0];
    const coverImageUrl = coverId
      ? `${COVERS_CDN}/b/id/${coverId}-L.jpg`
      : null;

    const genres = (data.subjects ?? []).slice(0, 5);
    const tags   = (data.subjects ?? []);

    return {
      title:         data.title ?? 'Unknown Title',
      author,
      artist:        null,
      synopsis,
      coverImageUrl,
      sourceSite:    'openlibrary.org',
      language:      'en',
      genres,
      tags,
      status:        'COMPLETED', // public-domain works are finished by definition
      type:          'EBOOK',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const key = extractOlKey(url);

    // Resolve work key → edition OLID for the Read API
    const workKey  = key.startsWith('/works/') ? key : null;
    const editionId = workKey
      ? await getEditionId(workKey)
      : key.split('/').pop() ?? null;

    if (!editionId) {
      // Fallback: one chapter pointing at the OL page itself
      return [{ number: 1, title: 'Full Text', url, publishedAt: null }];
    }

    // Check Open Library Read API for IA availability
    try {
      const readData = await olFetch<{
        items?: Array<{ itemURL?: string; status?: string }>;
      }>(`/api/volumes/brief/olid/${editionId}.json`);

      const readable = readData.items?.find(
        (i) => i.status === 'full access' && i.itemURL,
      );

      if (readable?.itemURL) {
        // Return the Internet Archive read URL as the single "chapter"
        return [
          { number: 1, title: 'Full Text (Internet Archive)', url: readable.itemURL, publishedAt: null },
        ];
      }
    } catch { /* non-fatal — fall through to stub */ }

    return [{ number: 1, title: 'View on Open Library', url, publishedAt: null }];
  }

  async extractChapterBody(sourceUrl: string): Promise<string> {
    // Open Library / Internet Archive full-text pages vary widely.
    // Return a safe HTML stub that links the reader to the source.
    const safeUrl = encodeURI(sourceUrl);
    const raw = `<p>This is a public-domain work hosted on Open Library / Internet Archive.</p>
<p><a href="${safeUrl}" rel="noopener noreferrer">Read the full text on Open Library</a></p>`;
    return sanitizeHtml(raw, SANITIZE_OPTIONS);
  }
}
