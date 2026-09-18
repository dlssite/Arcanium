/**
 * AO3Provider — https://archiveofourown.org (Archive of Our Own)
 *
 * Scrapes fan fiction from AO3, the largest non-profit fan fiction archive.
 * 10M+ works with excellent tagging and metadata.
 * HTML scraping (no official API, but well-structured HTML).
 * 
 * URL patterns:
 * - Work: https://archiveofourown.org/works/{id}
 * - Chapter: https://archiveofourown.org/works/{id}/chapters/{chapter_id}
 * 
 * Legal: Non-commercial use allowed per AO3 ToS.
 * Content type: WEB_NOVEL
 */

import sanitizeHtml from 'sanitize-html';
import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';
import { fetchWithPlaywright } from '../utils/playwright-helper.js';

const SITE_HOST = 'https://archiveofourown.org';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'blockquote', 'ul', 'ol', 'li', 'div', 'span'],
  allowedAttributes: { '*': ['class'] },
  allowedSchemes: [],
};

function extractWorkId(url: string): string {
  const match = url.match(/\/works\/(\d+)/i);
  if (!match?.[1]) throw new Error(`Cannot extract AO3 work ID from URL: ${url}`);
  return match[1];
}

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

export class AO3Provider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      return new URL(url).hostname.includes('archiveofourown.org');
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const html = await fetchWithPlaywright(url, {
      waitForSelector: 'h2.title, .preface',
      waitForTimeout: 2000,
    });
    const $ = loadCheerio(html);

    const title = 
      $('h2.title.heading').first().text().trim() || 
      $('.preface h2.title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() || 
      'Unknown Title';
    
    const author = 
      $('a[rel="author"]').first().text().trim() || 
      $('.byline a[rel="author"]').first().text().trim() ||
      null;
    
    const synopsis = 
      $('div.summary blockquote.userstuff').text().trim() || 
      $('.summary .userstuff').text().trim() ||
      $('blockquote.userstuff').first().text().trim() ||
      null;
    
    const tags: string[] = [];
    $('dd.freeform a.tag, .tags .freeform a').each((_, el) => { 
      const tag = $(el).text().trim();
      if (tag) tags.push(tag); 
    });
    
    const genres: string[] = [];
    $('dd.category a.tag, dd.rating a.tag, .tags .category a, .tags .rating a').each((_, el) => { 
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });

    const statusText = $('dd.status, .status').text().toLowerCase();
    let status: ContentMetadata['status'] = 'UNKNOWN';
    if (statusText.includes('completed') || statusText.includes('complete')) status = 'COMPLETED';
    else if (statusText.includes('work in progress') || statusText.includes('updated')) status = 'ONGOING';

    return {
      title,
      author,
      artist: null,
      synopsis,
      coverImageUrl: null,
      sourceSite: 'archiveofourown.org',
      language: 'en',
      genres: genres.slice(0, 5),
      tags,
      status,
      type: 'WEB_NOVEL',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const workId = extractWorkId(url);
    // Use the work index page — avoid view_full_work which times out for large works
    const html = await fetchWithPlaywright(`${SITE_HOST}/works/${workId}/navigate`, {
      waitForSelector: '#main, ol.chapter',
      waitForTimeout: 2000,
    });
    const $ = loadCheerio(html);
    const chapters: ChapterRef[] = [];

    // Navigate page lists all chapters as <li><a href="/works/{id}/chapters/{chapterId}">
    $('ol.chapter li, #chapters li, #main li').each((index, el) => {
      const link = $(el).find('a[href*="/chapters/"]').first();
      const href = link.attr('href');
      if (!href) return;

      const chapterUrl = href.startsWith('http') ? href : `${SITE_HOST}${href}`;
      const title = link.text().trim() || `Chapter ${index + 1}`;

      chapters.push({ number: index + 1, title, url: chapterUrl, publishedAt: null });
    });

    // Single-chapter work fallback
    if (chapters.length === 0) {
      chapters.push({ number: 1, title: 'Full Work', url, publishedAt: null });
    }

    return chapters;
  }

  async extractChapterBody(chapterUrl: string): Promise<string> {
    const html = await fetchWithPlaywright(chapterUrl, {
      waitForSelector: '.userstuff',
      waitForTimeout: 2000,
    });
    const $ = loadCheerio(html);

    const body = $('.userstuff.module').first();
    body.find('script, style').remove();

    const rawHtml = body.html()?.trim() ?? '';
    return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
  }
}
