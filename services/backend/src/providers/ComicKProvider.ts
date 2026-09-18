/**
 * ComicKProvider — https://comick.io / https://comick.app
 *
 * Manga/manhwa/webtoon aggregator with 100k+ titles.
 * Uses HTML scraping (API endpoint unreliable).
 * 
 * URL patterns:
 * - Series: https://comick.io/comic/{slug}
 * - Chapter: Extracted from page data
 * 
 * Content types: MANGA, MANHWA, WEBTOON, COMIC
 * Returns image URLs as JSON.stringify(string[]) for bodyText.
 */

import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';
import { fetchWithPlaywright, createBrowserContext } from '../utils/playwright-helper.js';

const SITE_HOST    = 'https://comick.io';
const IMAGE_CDN    = 'https://meo.comick.pictures';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/comic\/([^\/\?#]+)/i);
  if (!match?.[1]) {
    throw new Error(`Cannot extract Comick slug from URL: ${url}`);
  }
  return match[1];
}

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

function mapCountryToType(country?: string): ContentMetadata['type'] {
  if (!country) return 'MANGA';
  const countryLower = country.toLowerCase();
  if (countryLower === 'kr') return 'WEBTOON';
  if (countryLower === 'cn') return 'MANGA';
  if (countryLower === 'jp') return 'MANGA';
  return 'COMIC';
}

// ---------------------------------------------------------------------------
// ComicKProvider implementation
// ---------------------------------------------------------------------------

export class ComicKProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      return (
        hostname.includes('comick.io') ||
        hostname.includes('comick.app') ||
        hostname.includes('comick.fun')
      );
    } catch {
      return false;
    }
  }

  override isImageType(): boolean {
    return true;
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const context = await createBrowserContext();
    const page = await context.newPage();
    let html = '';
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
      // Wait for React to hydrate and render the title
      await page.waitForSelector('h1:not(:empty)', { timeout: 10_000 }).catch(() => {});
      html = await page.content();
    } finally {
      await page.close();
      await context.close();
    }
    const $ = loadCheerio(html);

    // Extract from page data or meta tags
    const title =
      $('h1, .comic-title, [class*="title"]').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      'Unknown Title';

    const synopsis =
      $('.comic-description, .description, [class*="description"]').first().text().trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;

    const coverImageUrl =
      $('img.comic-cover, .cover img, [class*="cover"] img').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      null;

    // Try to extract from JSON data in page
    let author: string | null = null;
    let genres: string[] = [];
    let country: string | null = null;
    let status: ContentMetadata['status'] = 'UNKNOWN';

    // Look for embedded JSON data (NEXT_DATA or similar)
    $('script#__NEXT_DATA__, script[type="application/json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (!jsonText) return;
        const data = JSON.parse(jsonText);
        
        // Navigate through the JSON to find comic data
        const findComicData = (obj: any): any => {
          if (obj && typeof obj === 'object') {
            if (obj.comic || obj.md_comics) return obj;
            for (const key in obj) {
              const result = findComicData(obj[key]);
              if (result) return result;
            }
          }
          return undefined;
        };

        const comicData = findComicData(data);
        if (comicData?.comic) {
          const comic = comicData.comic;
          author = comic.author || comic.authors?.[0] || null;
          country = comic.country || null;
          if (comic.genres) {
            genres = Array.isArray(comic.genres) ? comic.genres : [];
          }
          if (comic.status === 1) status = 'ONGOING';
          else if (comic.status === 2) status = 'COMPLETED';
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Fallback: extract from HTML
    if (!author) {
      author = $('.author, .comic-author, [class*="author"]').first().text().trim() || null;
    }

    if (genres.length === 0) {
      $('.genre, .tag, [class*="genre"]').each((_, el) => {
        const genre = $(el).text().trim();
        if (genre) genres.push(genre);
      });
    }

    const type = mapCountryToType(country ?? undefined);

    return {
      title,
      author,
      artist: null,
      synopsis,
      coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : null,
      sourceSite: 'comick.io',
      language: 'en',
      genres: genres.slice(0, 5),
      tags: genres,
      status,
      type,
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const slug = extractSlugFromUrl(url);
    const context = await createBrowserContext();
    const page = await context.newPage();
    let html = '';
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForSelector('h1:not(:empty)', { timeout: 10_000 }).catch(() => {});
      html = await page.content();
    } finally {
      await page.close();
      await context.close();
    }
    const $ = loadCheerio(html);
    const chapters: ChapterRef[] = [];

    // Try to extract from embedded JSON first
    $('script#__NEXT_DATA__, script[type="application/json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (!jsonText) return;
        const data = JSON.parse(jsonText);

        // Look for chapters array in the JSON
        const findChapters = (obj: any): any[] => {
          if (Array.isArray(obj)) {
            if (obj.length > 0 && obj[0].chap !== undefined) return obj;
          }
          if (obj && typeof obj === 'object') {
            for (const key in obj) {
              if (key === 'chapters' || key === 'chapterList') {
                if (Array.isArray(obj[key])) return obj[key];
              }
              const result = findChapters(obj[key]);
              if (result.length > 0) return result;
            }
          }
          return [];
        };

        const chapterList = findChapters(data);
        if (chapterList.length > 0) {
          chapterList.forEach((ch: any, index: number) => {
            const chapterNum = parseFloat(ch.chap || ch.chapter) || index + 1;
            chapters.push({
              number: chapterNum,
              title: ch.title || `Chapter ${ch.chap || chapterNum}`,
              url: JSON.stringify({
                slug,
                hid: ch.hid || ch.id,
                chap: ch.chap || ch.chapter,
                lang: ch.lang || 'en',
              }),
              publishedAt: ch.created_at ? new Date(ch.created_at) : null,
            });
          });
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Fallback: HTML scraping for chapter links
    if (chapters.length === 0) {
      $('a[href*="/chapter/"], .chapter-link, [class*="chapter"]').each((index, el) => {
        const link = $(el);
        const href = link.attr('href');
        if (!href) return;

        const chapterUrl = href.startsWith('http')
          ? href
          : `${SITE_HOST}${href.startsWith('/') ? href : '/' + href}`;

        const title = link.text().trim() || `Chapter ${index + 1}`;

        chapters.push({
          number: index + 1,
          title,
          url: chapterUrl,
          publishedAt: null,
        });
      });
    }

    return chapters.sort((a, b) => a.number - b.number);
  }

  async extractChapterBody(sourceUrl: string): Promise<string> {
    let chapterMeta: { slug: string; hid: string; chap: string; lang: string };

    // Try to parse as JSON metadata first
    try {
      chapterMeta = JSON.parse(sourceUrl);
    } catch {
      // If not JSON, treat as regular URL — fetch with full networkidle
      const context = await createBrowserContext();
      const page = await context.newPage();
      let html = '';
      try {
        await page.goto(sourceUrl, { waitUntil: 'networkidle', timeout: 30_000 });
        html = await page.content();
      } finally {
        await page.close();
        await context.close();
      }
      const $ = loadCheerio(html);
      const imageUrls: string[] = [];
      
      // Extract images from page
      $('img.chapter-img, .reader img, [class*="chapter"] img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src?.startsWith('http')) {
          imageUrls.push(src);
        }
      });

      // Try embedded JSON
      if (imageUrls.length === 0) {
        $('script#__NEXT_DATA__, script[type="application/json"]').each((_, el) => {
          try {
            const jsonText = $(el).html();
            if (!jsonText) return;
            const data = JSON.parse(jsonText);

            const findImages = (obj: any): void => {
              if (obj && typeof obj === 'object') {
                if (obj.md_images && Array.isArray(obj.md_images)) {
                  obj.md_images.forEach((img: any) => {
                    if (img.b2key) {
                      imageUrls.push(`${IMAGE_CDN}/${img.b2key}`);
                    }
                  });
                }
                Object.values(obj).forEach(findImages);
              }
            };

            findImages(data);
          } catch {
            // Ignore
          }
        });
      }

      if (imageUrls.length === 0) {
        throw new Error(`No images found for chapter: ${sourceUrl}`);
      }

      return JSON.stringify([...new Set(imageUrls)]);
    }

    // Fetch chapter page with networkidle
    const chapterUrl = `${SITE_HOST}/comic/${chapterMeta.slug}/${chapterMeta.hid}-chapter-${chapterMeta.chap}-${chapterMeta.lang}`;
    const context2 = await createBrowserContext();
    const page2 = await context2.newPage();
    let html2 = '';
    try {
      await page2.goto(chapterUrl, { waitUntil: 'networkidle', timeout: 30_000 });
      html2 = await page2.content();
    } finally {
      await page2.close();
      await context2.close();
    }
    const $2 = loadCheerio(html2);
    const imageUrls: string[] = [];

    $2('script#__NEXT_DATA__').each((_, el) => {
      try {
        const d = JSON.parse($2(el).html() || '{}');
        if (d?.props?.pageProps?.chapter?.md_images) {
          d.props.pageProps.chapter.md_images.forEach((img: any) => {
            if (img.b2key) imageUrls.push(`${IMAGE_CDN}/${img.b2key}`);
          });
        }
      } catch { }
    });

    if (imageUrls.length === 0) throw new Error(`No images found for chapter ${chapterMeta.chap}`);
    return JSON.stringify(imageUrls);
  }
}
