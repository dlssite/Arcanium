/**
 * WebtoonProvider — https://webtoons.com (Naver WEBTOON)
 *
 * Official webtoon platform from Naver.
 * HTML scraping (no public API).
 * 
 * URL patterns:
 * - Series: https://www.webtoons.com/en/{genre}/{title}/list?title_no={id}
 * - Episode: https://www.webtoons.com/en/{genre}/{title}/{episode}/viewer?title_no={id}&episode_no={ep}
 * 
 * Content type: WEBTOON
 */

import { ContentProvider } from './ContentProvider.js';
import type { ContentMetadata, ChapterRef } from './ContentProvider.js';

const SITE_HOST = 'https://www.webtoons.com';
const USER_AGENT = 'ArcaniumBot/1.0 (contact@arcanium.app)';

function extractTitleNo(url: string): string {
  const match = url.match(/[?&]title_no=(\d+)/i);
  if (!match?.[1]) throw new Error(`Cannot extract Webtoon title_no from URL: ${url}`);
  return match[1];
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html', 'Referer': SITE_HOST },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function loadCheerio(html: string): import('cheerio').CheerioAPI {
  const { load } = require('cheerio') as typeof import('cheerio');
  return load(html);
}

export class WebtoonProvider extends ContentProvider {
  canHandle(url: string): boolean {
    try {
      return new URL(url).hostname.includes('webtoons.com');
    } catch {
      return false;
    }
  }

  override isImageType(): boolean {
    return true;
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    const html = await fetchHtml(url);
    const $ = loadCheerio(html);

    const title = $('h1.subj, .info h1').first().text().trim() || 'Unknown Title';
    const author = $('.author_area .author, .info .author').first().text().trim() || null;
    const synopsis = $('.summary, .detail p').first().text().trim() || null;
    const coverImageUrl = $('img.thumb, .detail_header img').first().attr('src') || null;

    const genres: string[] = [];
    $('h2.genre, .info .genre').each((_, el) => { genres.push($(el).text().trim()); });

    const statusText = $('.day_info, .info .day').text().toLowerCase();
    const status: ContentMetadata['status'] = statusText.includes('completed') ? 'COMPLETED' : 'ONGOING';

    return {
      title,
      author,
      artist: author,
      synopsis,
      coverImageUrl,
      sourceSite: 'webtoons.com',
      language: 'en',
      genres: genres.slice(0, 5),
      tags: genres,
      status,
      type: 'WEBTOON',
    };
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    const html = await fetchHtml(url);
    const $ = loadCheerio(html);
    const chapters: ChapterRef[] = [];

    $('#_listUl li, .detail_lst li').each((index, el) => {
      const link = $(el).find('a').first();
      const href = link.attr('href');
      if (!href) return;

      const chapterUrl = href.startsWith('http') ? href : `${SITE_HOST}${href}`;
      const title = $(el).find('.subj span, .subj').first().text().trim() || `Episode ${index + 1}`;
      
      const dateText = $(el).find('.date').text().trim();
      let publishedAt: Date | null = null;
      if (dateText) {
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) publishedAt = parsed;
      }

      chapters.push({ number: index + 1, title, url: chapterUrl, publishedAt });
    });

    return chapters;
  }

  async extractChapterBody(chapterUrl: string): Promise<string> {
    const html = await fetchHtml(chapterUrl);
    const $ = loadCheerio(html);

    const imageUrls: string[] = [];
    $('.viewer_img img, #_imageList img').each((_, el) => {
      const src = $(el).attr('data-url') || $(el).attr('src');
      if (src?.startsWith('http')) imageUrls.push(src);
    });

    if (imageUrls.length === 0) throw new Error(`No images found for episode: ${chapterUrl}`);
    return JSON.stringify(imageUrls);
  }
}
