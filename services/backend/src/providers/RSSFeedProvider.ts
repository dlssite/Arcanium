
/**
 * RSSFeedProvider — RSS/Atom feed provider for web serials.
 *
 * Handles URLs that point directly to an RSS or Atom feed XML document.
 * Common on web serial sites (e.g. WordPress /feed/, ScribbleHub, etc.).
 *
 * Detection: URL path or query string contains well-known feed indicators,
 * OR the Content-Type header of a HEAD request is application/rss+xml /
 * application/atom+xml. The fast canHandle() check uses path heuristics
 * only — no network I/O.
 *
 * Chapter bodies: each feed <item> / <entry> may include a <content:encoded>
 * or <description> field. That HTML is sanitised before storage.
 *
 * Uses: rss-parser (ships its own types, no @types package needed).
 */

import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';

// Shared sanitise config — same strict allowlist as WebScraperProvider
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'del',
    'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'a', 'img',
    'div', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a:   ['href', 'title', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'], a: ['http', 'https', 'mailto'] },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
};

// ---------------------------------------------------------------------------
// rss-parser instance — extend to capture content:encoded
// ---------------------------------------------------------------------------

type FeedItem = {
  title?:          string;
  link?:           string;
  pubDate?:        string;
  isoDate?:        string;
  content?:        string;
  'content:encoded'?: string;
  contentSnippet?: string;
  guid?:           string;
};

type Feed = {
  title?:       string;
  description?: string;
  image?:       { url?: string };
  link?:        string;
  items:        FeedItem[];
};

const feedParser = new Parser<Feed, FeedItem>({
  customFields: {
    item: [['content:encoded', 'content:encoded']],
  },
  headers: { 'User-Agent': 'ArcaniumBot/1.0 (contact@arcanium.app)' },
  timeout: 10_000,
});

// ---------------------------------------------------------------------------
// URL heuristics for feed detection (synchronous — no network)
// ---------------------------------------------------------------------------

const FEED_PATH_PATTERNS = [
  /\/feed\/?$/i,
  /\/rss\/?$/i,
  /\/atom\/?$/i,
  /\/feed\.xml$/i,
  /\/rss\.xml$/i,
  /\/atom\.xml$/i,
  /[?&]feed=(rss|atom|rss2)/i,
  /\.rss$/i,
];

function looksFeedLike(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    const full = pathname + search;
    return FEED_PATH_PATTERNS.some((p) => p.test(full));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class RSSFeedProvider extends ContentProvider {
  canHandle(url: string): boolean {
    return looksFeedLike(url);
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const feed = await feedParser.parseURL(url);

    let hostname = url;
    try { hostname = new URL(url).hostname; } catch { /* noop */ }

    const siteLink = feed.link ?? url;
    let siteHostname = hostname;
    try { siteHostname = new URL(siteLink).hostname; } catch { /* noop */ }

    return {
      title:         feed.title?.trim() || 'Unknown Title',
      author:        null,
      artist:        null,
      synopsis:      feed.description?.trim() ?? null,
      coverImageUrl: feed.image?.url ?? null,
      sourceSite:    siteHostname,
      language:      'en',
      genres:        [],
      tags:          [],
      status:        'ONGOING', // RSS feeds are usually active serials
      type:          'WEB_NOVEL',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const feed = await feedParser.parseURL(url);

    return feed.items.map((item, index) => {
      const pubDate = item.isoDate ?? item.pubDate ?? null;
      return {
        number:      index + 1,
        title:       item.title?.trim() ?? null,
        url:         item.link ?? item.guid ?? url,
        publishedAt: pubDate ? new Date(pubDate) : null,
      };
    });
  }

  /**
   * The `sourceUrl` for RSS chapters is the item's <link> (an article page),
   * not a feed URL. The body is taken from content:encoded or description,
   * which the feed already loaded — but since we parse per-chapter we re-parse
   * the feed and match by URL.
   *
   * For feeds where items carry their full body inline this is instant.
   * For "teaser" feeds, we fall back to fetching the linked article.
   */
  async extractChapterBody(sourceUrl: string): Promise<string> {
    // sourceUrl might be a feed URL with a fragment indicating the item
    // OR a direct article URL. Try to find the item in the parent feed first.
    const feedUrl = sourceUrl.split('#')[0] ?? sourceUrl;
    let rawHtml = '';

    try {
      const feed   = await feedParser.parseURL(feedUrl);
      const match  = feed.items.find(
        (i) => (i.link ?? i.guid ?? '') === sourceUrl ||
               (i.link ?? i.guid ?? '') === feedUrl,
      );

      if (match) {
        // Prefer full content:encoded over truncated contentSnippet
        rawHtml =
          (match['content:encoded'] as string | undefined) ??
          match.content ??
          match.contentSnippet ??
          '';
      }
    } catch { /* non-fatal — fall through to direct fetch */ }

    if (!rawHtml) {
      // Feed item had no inline body; fetch the linked article page
      const res = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'ArcaniumBot/1.0 (contact@arcanium.app)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${sourceUrl}`);
      rawHtml = await res.text();
    }

    return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
  }
}
