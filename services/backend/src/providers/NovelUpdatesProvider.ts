/**
 * NovelUpdatesProvider — https://novelupdates.com
 *
 * Light novel tracker and aggregator (links to translation sites).
 * 40k+ novels, mostly Asian (Chinese, Korean, Japanese).
 * HTML scraping (no official API).
 * 
 * URL pattern:
 * - Novel: https://novelupdates.com/series/{slug}
 * 
 * Note: NovelUpdates aggregates links to translator sites, not host content.
 * Content type: LIGHT_NOVEL
 */

import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';
import { fetchWithPlaywright, createBrowserContext } from '../utils/playwright-helper.js';

const SITE_HOST = 'https://www.novelupdates.com';

function extractNovelSlug(url: string): string {
  const match = url.match(/\/series\/([^\/\?#]+)/i);
  if (!match?.[1]) throw new Error(`Cannot extract NovelUpdates slug from URL: ${url}`);
  return match[1];
}

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

export class NovelUpdatesProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      return new URL(url).hostname.includes('novelupdates.com');
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const context = await createBrowserContext();
    const page = await context.newPage();
    let html = '';
    try {
      // Use 'load' — 'networkidle' hangs forever on Cloudflare challenge
      await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
      // Wait for challenge to clear (title changes from "Just a moment...")
      await page.waitForFunction(
        () => !document.title.toLowerCase().includes('just a moment'),
        { timeout: 25_000 },
      ).catch(() => {});
      // Then wait for actual series content
      await page.waitForSelector('.seriestitlenu', { timeout: 10_000 })
        .catch(() => {});
      html = await page.content();
    } finally {
      await page.close();
      await context.close();
    }
    const $ = loadCheerio(html);

    const title = $('.seriestitlenu').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      'Unknown Title';

    const author = $('#showauthors a').first().text().trim() ||
      $('a[href*="novelupdates.com/author"]').first().text().trim() ||
      null;

    const synopsis = $('#editdescription p').text().trim() ||
      $('#editdescription').text().trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;

    const coverImageUrl = $('.seriesimg img').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      null;

    const genres: string[] = [];
    $('#seriesgenre a, .genre a').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    const tags: string[] = [];
    $('#showtags a, .tags a').each((_, el) => {
      const t = $(el).text().trim();
      if (t) tags.push(t);
    });

    const statusText = $('#editstatus, .seriesStatus').text().toLowerCase();
    let status: ContentMetadata['status'] = 'UNKNOWN';
    if (statusText.includes('completed')) status = 'COMPLETED';
    else if (statusText.includes('ongoing')) status = 'ONGOING';
    else if (statusText.includes('hiatus')) status = 'HIATUS';

    return {
      title,
      author,
      artist: null,
      synopsis,
      coverImageUrl,
      sourceSite: 'novelupdates.com',
      language: 'en',
      genres: genres.slice(0, 5),
      tags,
      status,
      type: 'LIGHT_NOVEL',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const slug = extractNovelSlug(url);
    const context = await createBrowserContext();
    const page = await context.newPage();
    let html = '';
    try {
      await page.goto(`${SITE_HOST}/series/${slug}`, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForFunction(
        () => !document.title.toLowerCase().includes('just a moment'),
        { timeout: 25_000 },
      ).catch(() => {});
      await page.waitForSelector('#myTable, .chapter-col', { timeout: 10_000 })
        .catch(() => {});
      html = await page.content();
    } finally {
      await page.close();
      await context.close();
    }
    const $ = loadCheerio(html);
    const chapters: ChapterRef[] = [];

    // NovelUpdates lists chapters with external links
    $('table#myTable tbody tr').each((_, el) => {
      const link = $(el).find('a[data-id]').first();
      const href = link.attr('href');
      if (!href) return;

      const titleText = link.text().trim();
      const chapterNum = chapters.length + 1;

      chapters.push({
        number: chapterNum,
        title: titleText || `Chapter ${chapterNum}`,
        url: href,
        publishedAt: null,
      });
    });

    return chapters.reverse(); // NovelUpdates lists newest first
  }

  async extractChapterBody(chapterUrl: string): Promise<string> {
    // NovelUpdates links to external translation sites
    // Return a redirect notice
    return `<p>This chapter is hosted on an external translation site.</p><p><a href="${chapterUrl}" target="_blank" rel="noopener noreferrer">Read on ${new URL(chapterUrl).hostname}</a></p>`;
  }
}
