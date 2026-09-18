/**
 * TapasProvider — https://tapas.io
 *
 * Web comics and novels platform (both free and premium content).
 * 8000+ series including comics, novels, and webcomics.
 *
 * Uses Playwright because:
 *  - Episode lists are loaded via XHR/JS (not in initial HTML)
 *  - Series pages are server-side rendered with React hydration
 *
 * URL patterns:
 * - Series:  https://tapas.io/series/{slug}
 * - Episode: https://tapas.io/episode/{id}
 *
 * Content types: COMIC, WEBTOON, WEB_NOVEL
 */

import sanitizeHtml from 'sanitize-html';
import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';
import { fetchWithPlaywright, createBrowserContext } from '../utils/playwright-helper.js';

const SITE_HOST = 'https://tapas.io';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'blockquote', 'ul', 'ol', 'li', 'div', 'span'],
  allowedAttributes: { '*': ['class'] },
  allowedSchemes: [],
};

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

/** Extract series ID from the rendered page HTML */
function extractSeriesId(html: string): string | null {
  // Tapas embeds the series ID in window.__TAPAS__ or data attributes
  const match =
    html.match(/"seriesId"\s*:\s*(\d+)/) ||
    html.match(/series[_-]?id["']?\s*[=:]\s*["']?(\d+)/) ||
    html.match(/\/series\/(\d+)\/episodes/);
  return match?.[1] ?? null;
}

export class TapasProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      return new URL(url).hostname.includes('tapas.io');
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    // Tapas is React — wait for the series info block to hydrate
    const html = await fetchWithPlaywright(url, {
      waitForSelector: '.series-header, .info__title, h1',
      waitForTimeout: 2000,
    });
    const $ = loadCheerio(html);

    // Title — og:title is the most reliable on Tapas
    const rawTitle =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('h1.title, .info__title, h1').first().text().trim() ||
      'Unknown Title';
    // Strip site suffix "| Tapas" if present
    const title = rawTitle.replace(/\s*[|\-–]\s*Tapas.*$/i, '').trim();

    const author =
      $('a.name, .creator-section__name, .info__user a').first().text().trim() || null;

    const synopsis =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('.series-header__description, .description__body').first().text().trim() ||
      null;

    const coverImageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('img.thumb__img, .series-header__thumbnail img').first().attr('src') ||
      null;

    const genres: string[] = [];
    $('a.genre, .genre-button, [class*="genre"] a').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    // Tapas distinguishes "COMIC" vs "NOVEL" in the series type badge
    const typeText = $('[class*="type-badge"], .series-type, .badge').text().toLowerCase();
    const type: ContentMetadata['type'] = typeText.includes('novel') ? 'WEB_NOVEL' : 'COMIC';

    const statusText = $('[class*="status"], .series-status').text().toLowerCase();
    let status: ContentMetadata['status'] = 'UNKNOWN';
    if (statusText.includes('completed') || statusText.includes('complete')) status = 'COMPLETED';
    else if (statusText.includes('ongoing') || statusText.includes('updating')) status = 'ONGOING';
    else if (statusText.includes('hiatus')) status = 'HIATUS';

    return {
      title,
      author,
      artist: author,
      synopsis,
      coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : null,
      sourceSite: 'tapas.io',
      language: 'en',
      genres: genres.slice(0, 5),
      tags: genres,
      status,
      type,
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const context = await createBrowserContext();
    const page = await context.newPage();
    const chapters: ChapterRef[] = [];

    try {
      const episodePages: any[] = [];

      page.on('response', async (response) => {
        const reqUrl = response.url();
        if (reqUrl.includes('/api/v2/series/') && reqUrl.includes('/episodes')) {
          try {
            const json = await response.json();
            if (json?.data?.episodes) episodePages.push(...json.data.episodes);
            else if (Array.isArray(json?.data)) episodePages.push(...json.data);
          } catch { /* non-JSON */ }
        }
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // Prefer API-intercepted episodes
      if (episodePages.length > 0) {
        episodePages.forEach((ep: any, index: number) => {
          const episodeId = ep.id ?? ep.episodeId;
          if (!episodeId) return;
          chapters.push({
            number: ep.displayOrder ?? index + 1,
            title: ep.title ?? `Episode ${index + 1}`,
            url: `${SITE_HOST}/episode/${episodeId}`,
            publishedAt: ep.publishDate ? new Date(ep.publishDate) : null,
          });
        });
      } else {
        // Fallback: episode links are in the HTML already
        const html = await page.content();
        const $ = loadCheerio(html);
        const seen = new Set<string>();

        $('a[href*="/episode/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href || href.includes('m.tapas.io')) return; // skip mobile mirror
          const epUrl = href.startsWith('http') ? href : `${SITE_HOST}${href}`;
          if (seen.has(epUrl)) return;
          seen.add(epUrl);

          const title =
            $(el).find('.title, .episode-title').text().trim() ||
            $(el).attr('title')?.trim() ||
            `Episode ${chapters.length + 1}`;

          chapters.push({
            number: chapters.length + 1,
            title,
            url: epUrl,
            publishedAt: null,
          });
        });
      }
    } finally {
      await page.close();
      await context.close();
    }

    return chapters.sort((a, b) => a.number - b.number);
  }

  async extractChapterBody(chapterUrl: string): Promise<string> {
    // Episodes also load images after hydration
    const html = await fetchWithPlaywright(chapterUrl, {
      waitForSelector: '.viewer__img, .episode-content img, .content img',
      waitForTimeout: 3000,
    });
    const $ = loadCheerio(html);

    // --- Image-based (comic) episode ---
    const imageUrls: string[] = [];
    $('.viewer__img img, .episode-content img, .content img').each((_, el) => {
      const src =
        $(el).attr('src') ||
        $(el).attr('data-src') ||
        $(el).attr('data-lazy-src');
      if (src?.startsWith('http')) imageUrls.push(src);
    });

    if (imageUrls.length > 0) {
      return JSON.stringify([...new Set(imageUrls)]);
    }

    // --- Text-based (novel) episode ---
    const body = $('.viewer__body, .episode-content, .content__body').first();
    body.find('script, style, .ads, .advertisement').remove();
    const rawHtml = body.html()?.trim() ?? '';

    if (!rawHtml) throw new Error(`No content found for episode: ${chapterUrl}`);

    return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
  }
}
