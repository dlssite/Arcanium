
/**
 * WebScraperProvider — HTML scraping fallback provider.
 *
 * Combines the logic previously split between royalroad.parser.ts (Cheerio)
 * and generic.parser.ts (Readability/JSDOM) into a single class.
 *
 * Critical fixes applied:
 *   L8 — robots.txt compliance: checks robots.txt before every fetch.
 *         Throws RobotsDisallowedError if the bot is not allowed.
 *   L5 — XSS sanitisation: all HTML returned by extractChapterBody is
 *         passed through sanitize-html with a strict allowlist before
 *         being returned to callers or written to the database.
 *
 * canHandle() returns true for all URLs — this is the last-resort fallback.
 * Place it last in the provider registry.
 */

import sanitizeHtml from 'sanitize-html';
import robotsParser from 'robots-parser';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';
import { ContentProvider } from './ContentProvider.js';

// ---------------------------------------------------------------------------
// Custom error for robots.txt violations (L8)
// ---------------------------------------------------------------------------

export class RobotsDisallowedError extends Error {
  constructor(url: string) {
    super(`robots.txt disallows crawling: ${url}`);
    this.name = 'RobotsDisallowedError';
  }
}

// ---------------------------------------------------------------------------
// sanitize-html allowlist (L5)
// Permits standard prose/fiction HTML tags. Strips scripts, iframes,
// inline event handlers, data: URIs, and javascript: hrefs entirely.
// ---------------------------------------------------------------------------

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'a', 'img',
    'div', 'span', 'section', 'article',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'figure', 'figcaption',
  ],
  allowedAttributes: {
    a:   ['href', 'title', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'id'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
    a:   ['http', 'https', 'mailto'],
  },
  // Strip any attribute value that looks like javascript: or data:
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Remove empty tags that Readability sometimes leaves
  exclusiveFilter: (frame) =>
    frame.tag === 'span' && !frame.text.trim() && !frame.mediaChildren.length,
};

// ---------------------------------------------------------------------------
// robots.txt cache — one entry per hostname, TTL = 1 hour
// ---------------------------------------------------------------------------

interface RobotsCacheEntry {
  robots: ReturnType<typeof robotsParser>;
  fetchedAt: number;
}

const robotsCache = new Map<string, RobotsCacheEntry>();
const ROBOTS_TTL_MS = 60 * 60 * 1000; // 1 hour
const BOT_AGENT     = 'ArcaniumBot';

async function isAllowedByRobots(url: string): Promise<boolean> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return true; // malformed URL — let it fail naturally downstream
  }

  const cached = robotsCache.get(origin);
  const now    = Date.now();

  if (cached && now - cached.fetchedAt < ROBOTS_TTL_MS) {
    return cached.robots.isAllowed(url, BOT_AGENT) ?? true;
  }

  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': `${BOT_AGENT}/1.0 (contact@arcanium.app)` },
      signal: AbortSignal.timeout(5_000),
    });
    const text = res.ok ? await res.text() : '';
    const robots = robotsParser(robotsUrl, text);
    robotsCache.set(origin, { robots, fetchedAt: now });
    return robots.isAllowed(url, BOT_AGENT) ?? true;
  } catch {
    // If robots.txt is unreachable assume allowed (fail-open is standard practice)
    return true;
  }
}

// ---------------------------------------------------------------------------
// HTML fetch helper
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': `${BOT_AGENT}/1.0 (reading archive; contact@arcanium.app)`,
      Accept:        'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Cheerio loader (dynamic require — keeps build safe before pnpm install)
// ---------------------------------------------------------------------------

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

// ---------------------------------------------------------------------------
// Readability helper (dynamic require)
// ---------------------------------------------------------------------------

function parseWithReadability(
  html: string,
  url: string,
): { title: string; content: string; excerpt: string } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Readability } = require('@mozilla/readability') as typeof import('@mozilla/readability');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom') as typeof import('jsdom');

  const dom    = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (!article) throw new Error(`Readability could not parse: ${url}`);
  return {
    title:   article.title   ?? '',
    content: article.content ?? '',
    excerpt: article.excerpt ?? '',
  };
}

// ---------------------------------------------------------------------------
// Royal Road — site-specific selectors
// ---------------------------------------------------------------------------

const ROYAL_ROAD_HOST = 'royalroad.com';

function isRoyalRoad(url: string): boolean {
  try { return new URL(url).hostname.includes(ROYAL_ROAD_HOST); }
  catch { return false; }
}

async function rrExtractMetadata(url: string): Promise<ContentMetadata> {
  const html = await fetchHtml(url);
  const $    = loadCheerio(html);

  const title =
    $('h1.font-white').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    'Unknown Title';

  // Royal Road author selector — try multiple selectors in priority order because
  // RR has changed its markup over time.
  //   1. <a href="/profile/..."> inside the author widget (current markup)
  //   2. property="name" RDFa span (legacy)
  //   3. og:site_name is NOT the author — skip it
  const author =
    $('h4.font-white a[href*="/profile/"]').first().text().trim() ||
    $('a[href*="/profile/"]').filter((_: number, el) => {
      const href = $(el).attr('href') ?? '';
      return href.startsWith('/profile/');
    }).first().text().trim() ||
    $('span[property="name"]').first().text().trim() ||
    $('meta[name="twitter:creator"]').attr('content')?.replace(/^@/, '').trim() ||
    null;

  const synopsis =
    $('.description .hidden-content').text().trim() ||
    $('.description').text().trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;

  const coverImageUrl =
    $('img.thumbnail').attr('src') ||
    $('meta[property="og:image"]').attr('content') ||
    null;

  const tags: string[] = [];
  $('a.label.label-default.tag').each((_: number, el) => {
    const tag = $(el).text().trim();
    if (tag) tags.push(tag);
  });

  const statusText = $('.label-success, .label-warning, .label-danger')
    .first().text().trim().toUpperCase();
  const status: ContentMetadata['status'] =
    statusText.includes('COMPLETE') ? 'COMPLETED'
    : statusText.includes('HIATUS') ? 'HIATUS'
    : 'ONGOING';

  return {
    title,
    author,
    artist:        null,
    synopsis,
    coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : null,
    sourceSite:    ROYAL_ROAD_HOST,
    language:      'en',
    genres:        tags.slice(0, 5),
    tags,
    status,
    type:          'WEB_NOVEL',
  };
}

async function rrExtractChapterList(url: string): Promise<ChapterRef[]> {
  const html = await fetchHtml(url);
  const $    = loadCheerio(html);
  const chapters: ChapterRef[] = [];

  $('table#chapters tbody tr').each((_: number, row) => {
    const link  = $(row).find('a[href*="/chapter/"]');
    const href  = link.attr('href');
    if (!href) return;

    const chapterUrl = href.startsWith('http')
      ? href
      : `https://www.royalroad.com${href}`;

    const dateAttr   = $(row).find('time').attr('datetime');
    chapters.push({
      number:      chapters.length + 1,
      title:       link.text().trim() || null,
      url:         chapterUrl,
      publishedAt: dateAttr ? new Date(dateAttr) : null,
    });
  });

  return chapters;
}

async function rrExtractChapterBody(chapterUrl: string): Promise<string> {
  const html = await fetchHtml(chapterUrl);
  const $    = loadCheerio(html);

  const body = $('.chapter-content');
  if (body.length === 0) throw new Error(`Could not find chapter body at ${chapterUrl}`);

  body.find('script, .ads-holder, [class*="sponsor"]').remove();

  const rawHtml = body.html()?.trim() ?? '';
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}

// ---------------------------------------------------------------------------
// Generic (Readability) — all other sites
// ---------------------------------------------------------------------------

async function genericExtractMetadata(url: string): Promise<ContentMetadata> {
  const html = await fetchHtml(url);
  const { title, excerpt } = parseWithReadability(html, url);

  const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  const coverImageUrl = ogImageMatch?.[1] ?? null;

  let hostname = url;
  try { hostname = new URL(url).hostname; } catch { /* noop */ }

  return {
    title:         title || 'Unknown Title',
    author:        null,
    artist:        null,
    synopsis:      excerpt || null,
    coverImageUrl,
    sourceSite:    hostname,
    language:      'en',
    genres:        [],
    tags:          [],
    status:        'UNKNOWN',
    type:          'WEB_NOVEL',
  };
}

async function genericExtractChapterBody(chapterUrl: string): Promise<string> {
  const html    = await fetchHtml(chapterUrl);
  const { content } = parseWithReadability(html, chapterUrl);
  return sanitizeHtml(content, SANITIZE_OPTIONS);
}

// ---------------------------------------------------------------------------
// WebScraperProvider class
// ---------------------------------------------------------------------------

export class WebScraperProvider extends ContentProvider {
  /** Always handles — must be last in the registry. */
  canHandle(_url: string): boolean {
    return true;
  }

  /**
   * L8 — robots.txt gate applied before every outbound fetch.
   * Throws RobotsDisallowedError so the caller can surface it cleanly.
   */
  private async assertRobotsAllowed(url: string): Promise<void> {
    const allowed = await isAllowedByRobots(url);
    if (!allowed) throw new RobotsDisallowedError(url);
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    await this.assertRobotsAllowed(url);
    return isRoyalRoad(url)
      ? rrExtractMetadata(url)
      : genericExtractMetadata(url);
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    await this.assertRobotsAllowed(url);

    if (isRoyalRoad(url)) return rrExtractChapterList(url);

    // Generic: treat the URL itself as a single chapter
    return [{ number: 1, title: null, url, publishedAt: null }];
  }

  /**
   * L8 + L5 — robots check then sanitised HTML output.
   */
  async extractChapterBody(chapterUrl: string): Promise<string> {
    await this.assertRobotsAllowed(chapterUrl);
    return isRoyalRoad(chapterUrl)
      ? rrExtractChapterBody(chapterUrl)
      : genericExtractChapterBody(chapterUrl);
  }
}
