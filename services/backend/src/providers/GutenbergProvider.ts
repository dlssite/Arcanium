/**
 * GutenbergProvider — https://gutenberg.org (Project Gutenberg)
 *
 * Public domain ebooks (70k+ titles).
 * Uses Gutenberg's unofficial API/RSS feeds.
 * 
 * URL patterns:
 * - Book: https://gutenberg.org/ebooks/{id}
 * 
 * Content type: EBOOK (classics, non-fiction)
 */

import sanitizeHtml from 'sanitize-html';
import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';

const SITE_HOST = 'https://www.gutenberg.org';
const USER_AGENT = 'ArcaniumBot/1.0 (contact@arcanium.app)';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'blockquote', 'ul', 'ol', 'li', 'div'],
  allowedAttributes: {},
  allowedSchemes: [],
};

function extractBookId(url: string): string {
  const match = url.match(/\/ebooks\/(\d+)/i);
  if (!match?.[1]) throw new Error(`Cannot extract Gutenberg book ID from URL: ${url}`);
  return match[1];
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

export class GutenbergProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      return new URL(url).hostname.includes('gutenberg.org');
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const html = await fetchHtml(url);
    const $ = loadCheerio(html);

    const title = $('h1[itemprop="name"], td[itemprop="headline"]').first().text().trim() || 'Unknown Title';
    const author = $('a[itemprop="creator"], td[itemprop="creator"]').first().text().trim() || null;
    const synopsis = $('td[itemprop="description"]').text().trim() || null;

    const genres: string[] = [];
    $('td a[href*="/ebooks/subject/"]').each((_, el) => { genres.push($(el).text().trim()); });

    return {
      title,
      author,
      artist: null,
      synopsis,
      coverImageUrl: null,
      sourceSite: 'gutenberg.org',
      language: 'en',
      genres: genres.slice(0, 5),
      tags: genres,
      status: 'COMPLETED',
      type: 'EBOOK',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const bookId = extractBookId(url);
    return [{
      number: 1,
      title: 'Full Text',
      url: `${SITE_HOST}/files/${bookId}/${bookId}-h/${bookId}-h.htm`,
      publishedAt: null,
    }];
  }

  async extractChapterBody(chapterUrl: string): Promise<string> {
    const html = await fetchHtml(chapterUrl);
    const $ = loadCheerio(html);

    $('script, style, header, nav, .toc').remove();
    const body = $('body').html()?.trim() ?? '';
    return sanitizeHtml(body, SANITIZE_OPTIONS);
  }
}
