/**
 * Generic parser — fallback for any URL not handled by a dedicated parser.
 *
 * Uses @mozilla/readability to extract article text from any web page.
 * Suitable for standalone web novels, blog-format fiction, Wattpad, etc.
 *
 * NOTE: @mozilla/readability is imported with dynamic require so the build
 * doesn't fail before packages are installed.
 */

import type { Parser, ContentMetadata, ChapterRef } from './types.js';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ArcaniumBot/1.0 (reading archive; contact@arcanium.app)',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseWithReadability(html: string, url: string): { title: string; content: string; excerpt: string } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Readability } = require('@mozilla/readability') as typeof import('@mozilla/readability');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom') as typeof import('jsdom');

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (!article) throw new Error(`Readability could not parse: ${url}`);
  return {
    title:   article.title   ?? '',
    content: article.content ?? '',
    excerpt: article.excerpt ?? '',
  };
}

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

export const genericParser: Parser = {
  canHandle(_url: string) {
    return true; // always handles as last resort
  },

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const html = await fetchHtml(url);
    const { title, excerpt } = parseWithReadability(html, url);

    // Try to extract og:image for cover
    const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const coverImageUrl = ogImageMatch?.[1] ?? null;

    const hostname = getHostname(url);

    return {
      title: title || 'Unknown Title',
      author: null,
      artist: null,
      synopsis: excerpt || null,
      coverImageUrl,
      sourceSite: hostname,
      language: 'en',
      genres: [],
      tags: [],
      status: 'UNKNOWN',
      type: 'WEB_NOVEL',
    };
  },

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    // Generic parser treats the URL itself as a single chapter
    return [
      {
        number: 1,
        title: null,
        url,
        publishedAt: null,
      },
    ];
  },

  async extractChapterBody(chapterUrl: string): Promise<string> {
    const html = await fetchHtml(chapterUrl);
    const { content } = parseWithReadability(html, chapterUrl);
    return content;
  },
};
