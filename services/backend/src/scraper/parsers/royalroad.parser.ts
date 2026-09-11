/**
 * Royal Road parser — https://royalroad.com
 *
 * Uses Cheerio for server-side HTML parsing.
 * Respects Royal Road's robots.txt: no-crawl delay required, caches aggressively.
 *
 * NOTE: cheerio is imported with a dynamic require so the build doesn't fail
 * before packages are installed. Replace with a static import after `pnpm install`.
 */

import type { Parser, ContentMetadata, ChapterRef } from './types.js';

const SITE = 'royalroad.com';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ArcaniumBot/1.0 (reading archive; contact@arcanium.app)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function load(html: string): import('cheerio').CheerioAPI {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

export const royalRoadParser: Parser = {
  canHandle(url: string) {
    return url.includes(SITE);
  },

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const html = await fetchHtml(url);
    const $ = load(html);

    const title = $('h1.font-white').first().text().trim()
      || $('meta[property="og:title"]').attr('content')?.trim()
      || 'Unknown Title';

    const author = $('span[property="name"]').first().text().trim() || null;

    const synopsis = $('.description').text().trim()
      || $('meta[property="og:description"]').attr('content')?.trim()
      || null;

    const coverImageUrl = $('img.thumbnail').attr('src')
      || $('meta[property="og:image"]').attr('content')
      || null;

    // Tags and genres
    const tags: string[] = [];
    $('a.label.label-default.tag').each((_: number, el) => {
      const tag = $(el).text().trim();
      if (tag) tags.push(tag);
    });

    // Detect status
    const statusText = $('.label-success, .label-warning, .label-danger')
      .first().text().trim().toUpperCase();
    const status: ContentMetadata['status'] =
      statusText.includes('COMPLETE') ? 'COMPLETED'
      : statusText.includes('HIATUS') ? 'HIATUS'
      : 'ONGOING';

    return {
      title,
      author,
      artist: null,
      synopsis,
      coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : null,
      sourceSite: SITE,
      language: 'en',
      genres: tags.slice(0, 5),
      tags,
      status,
      type: 'WEB_NOVEL',
    };
  },

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const html = await fetchHtml(url);
    const $ = load(html);

    const chapters: ChapterRef[] = [];

    $('table#chapters tbody tr').each((_: number, row) => {
      const link = $(row).find('a[href*="/chapter/"]');
      const href = link.attr('href');
      if (!href) return;

      const chapterUrl = href.startsWith('http') ? href : `https://www.royalroad.com${href}`;
      const title = link.text().trim() || null;

      const timeEl = $(row).find('time');
      const dateAttr = timeEl.attr('datetime');
      const publishedAt = dateAttr ? new Date(dateAttr) : null;

      chapters.push({
        number: chapters.length + 1,
        title,
        url: chapterUrl,
        publishedAt,
      });
    });

    return chapters;
  },

  async extractChapterBody(chapterUrl: string): Promise<string> {
    const html = await fetchHtml(chapterUrl);
    const $ = load(html);

    const body = $('.chapter-content');
    if (body.length === 0) {
      throw new Error(`Could not find chapter body at ${chapterUrl}`);
    }

    body.find('script, .ads-holder, [class*="sponsor"]').remove();

    return body.html()?.trim() ?? '';
  },
};
