/**
 * AsuraScansProvider — https://asuracomic.net
 *
 * Scrapes manga/manhwa from AsuraScans, a popular scanlation group.
 * Uses HTML scraping with Cheerio (no official API available).
 * 
 * URL patterns:
 * - Series: https://asuracomic.net/series/{slug}-{id}
 * - Chapter: https://asuracomic.net/series/{slug}/chapter/{num}
 * 
 * Content types: MANGA, MANHWA (mostly Korean manhwa)
 * Returns image URLs as JSON.stringify(string[]) for bodyText.
 */

import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';
import { createBrowserContext } from '../utils/playwright-helper.js';

const SITE_HOST = 'https://asurascans.com';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const context = await createBrowserContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // Wait for series page — title should NOT be the generic homepage title
    await page.waitForFunction(
      () => !document.title.toLowerCase().startsWith('asura scans -'),
      { timeout: 10_000 },
    ).catch(() => {});
    return await page.content();
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Load Cheerio for HTML parsing
 */
function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

/**
 * Determine if content is manhwa (Korean) or manga (Japanese)
 */
function detectContentType(genres: string[]): ContentMetadata['type'] {
  // AsuraScans primarily hosts manhwa
  const genresLower = genres.map((g) => g.toLowerCase());
  if (genresLower.some((g) => g.includes('manhwa') || g.includes('korean'))) {
    return 'WEBTOON';
  }
  // Default to manga for Japanese content
  return 'MANGA';
}

// ---------------------------------------------------------------------------
// AsuraScansProvider implementation
// ---------------------------------------------------------------------------

export class AsuraScansProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      return (
        hostname.includes('asurascans.com') ||
        hostname.includes('asuracomic.net') ||
        hostname.includes('asurascans.io')
      );
    } catch {
      return false;
    }
  }

  override isImageType(): boolean { return true; }

  /** Chapter links use /comics/ or /series/ — normalise both */
  private chapterLinkBase(url: string): string {
    try {
      const u = new URL(url);
      // /series/{slug}/chapter/{n}  OR  /comics/{slug}/chapter/{n}
      const slug = (u.pathname.match(/\/(?:series|comics)\/([^\/]+)/i))?.[1] ?? '';
      return `${u.origin}/comics/${slug}`;
    } catch {
      return url;
    }
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const html = await fetchHtml(url);
    const $ = loadCheerio(html);

    // Extract title - be more specific to avoid site title
    const title =
      $('h1.text-xl.font-bold, h1[class*="series"], .series-header h1').first().text().trim() ||
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim()?.replace(/\s*-\s*Asura Scans.*$/i, '') ||
      'Unknown Title';

    // Extract author/artist from metadata sections
    const author =
      $('div:contains("Author") ~ div, .author, [class*="author"]').first().text().trim() ||
      $('h3:contains("Author") + span, h3:contains("Author") ~ span').first().text().trim() ||
      null;

    const artist =
      $('div:contains("Artist") ~ div, .artist, [class*="artist"]').first().text().trim() ||
      $('h3:contains("Artist") + span, h3:contains("Artist") ~ span').first().text().trim() ||
      null;

    // Extract synopsis from description section
    const synopsis =
      $('div.description, .series-description, [class*="description"]').first().text().trim() ||
      $('.summary, [class*="summary"]').first().text().trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;

    // Extract cover image - look for larger images
    const coverImageUrl =
      $('img[class*="cover"], img[class*="poster"], .series-image img').first().attr('src') ||
      $('img[alt*="cover" i], img[alt*="poster" i]').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      null;

    // Extract genres/tags from tag sections
    const genres: string[] = [];
    $('a[href*="/genres/"], a[href*="/genre/"], .genre-tag, [class*="genre"] a').each((_, el) => {
      const genre = $(el).text().trim();
      if (genre && genre.length > 0 && !genre.toLowerCase().includes('asura')) {
        genres.push(genre);
      }
    });

    // Extract status from status indicators
    const statusText = $('div:contains("Status"), .status, [class*="status"]').text().toLowerCase();
    let status: ContentMetadata['status'] = 'UNKNOWN';
    if (statusText.includes('ongoing')) status = 'ONGOING';
    else if (statusText.includes('completed') || statusText.includes('complete')) status = 'COMPLETED';
    else if (statusText.includes('hiatus')) status = 'HIATUS';

    // Determine content type (manhwa vs manga) - AsuraScans is primarily manhwa
    const type = detectContentType(genres);

    return {
      title: title.replace(/\s*-\s*Asura Scans.*$/i, ''), // Clean up title
      author,
      artist,
      synopsis,
      coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : null,
      sourceSite: 'asuracomic.net',
      language: 'en',
      genres: genres.slice(0, 5),
      tags: genres,
      status,
      type,
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const html = await fetchHtml(url);
    const $ = loadCheerio(html);
    const chapters: ChapterRef[] = [];

    // AsuraScans renders chapter list as server-side HTML
    // Chapter links match: /series/{slug}/chapter/{number}
    $('a[href*="/chapter/"]').each((_, el) => {
      const link = $(el);
      const href = link.attr('href');
      if (!href) return;

      // Must match the chapter number pattern specifically
      const chapterNumMatch = href.match(/\/chapter\/(\d+(?:\.\d+)?)\/?$/i);
      if (!chapterNumMatch?.[1]) return;

      const chapterNum = parseFloat(chapterNumMatch[1]);
      if (isNaN(chapterNum)) return;

      // Avoid duplicates by chapter number
      if (chapters.some((ch) => ch.number === chapterNum)) return;

      const chapterUrl = href.startsWith('http')
        ? href
        : `${SITE_HOST}${href.startsWith('/') ? href : '/' + href}`;

      // Title: prefer explicit title text inside the link, strip chapter number prefix
      const rawTitle = link.find('.chapter-title, .title, span').first().text().trim()
        || link.text().trim();
      const title = rawTitle
        .replace(/^chapter\s+\d+(?:\.\d+)?[\s\-:]*/i, '')
        .trim() || `Chapter ${chapterNum}`;

      // Date: look in closest list item or sibling, not inside the link itself
      const row = link.closest('li, div, tr');
      const dateText = row.find('time, [class*="date"], [class*="time"]').not(link.find('*')).first().text().trim();
      let publishedAt: Date | null = null;
      if (dateText) {
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) publishedAt = parsed;
      }

      chapters.push({ number: chapterNum, title, url: chapterUrl, publishedAt });
    });

    return chapters.sort((a, b) => a.number - b.number);
  }

  /**
   * Extract chapter images from the chapter page.
   * Returns JSON.stringify(string[]) of image URLs.
   */
  async extractChapterBody(chapterUrl: string): Promise<string> {
    const html = await fetchHtml(chapterUrl);
    const $ = loadCheerio(html);

    // AsuraScans typically loads images in the chapter viewer
    // Common selectors: img inside chapter-container, reader, or data-src attributes
    const imageUrls: string[] = [];

    // Method 1: Look for images in the chapter reader container
    $(
      '.chapter-content img, .reader img, .chapter-reader img, [class*="chapter"] img, [id*="chapter"] img',
    ).each((_, el) => {
      const img = $(el);
      const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
      if (src && src.startsWith('http')) {
        imageUrls.push(src);
      }
    });

    // Method 2: Look for images in script tags (sometimes data is embedded in JS)
    if (imageUrls.length === 0) {
      const scripts = $('script:not([src])').toArray();
      for (const script of scripts) {
        const scriptContent = $(script).html() || '';
        
        // Look for image URL patterns in JavaScript
        const urlMatches = scriptContent.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp|gif)/gi);
        if (urlMatches) {
          imageUrls.push(...urlMatches);
        }
      }
    }

    // Method 3: Check for JSON data in script tags
    if (imageUrls.length === 0) {
      $('script[type="application/json"], script#__NEXT_DATA__').each((_, el) => {
        try {
          const htmlContent = $(el).html();
          if (!htmlContent) return;
          const data = JSON.parse(htmlContent);
          // Recursively search for image URLs in the JSON
          const findImages = (obj: any): void => {
            if (typeof obj === 'string' && /\.(jpg|jpeg|png|webp|gif)$/i.test(obj)) {
              if (obj.startsWith('http')) imageUrls.push(obj);
            } else if (Array.isArray(obj)) {
              obj.forEach(findImages);
            } else if (typeof obj === 'object' && obj !== null) {
              Object.values(obj).forEach(findImages);
            }
          };
          findImages(data);
        } catch {
          // Ignore parse errors
        }
      });
    }

    if (imageUrls.length === 0) {
      throw new Error(`No images found for chapter: ${chapterUrl}`);
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(imageUrls)];

    // Return as JSON string array
    return JSON.stringify(uniqueUrls);
  }
}
