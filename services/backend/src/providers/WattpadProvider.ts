/**
 * WattpadProvider — https://wattpad.com
 *
 * Scrapes web novels from Wattpad story pages.
 * Uses Cheerio for HTML parsing.
 * 
 * NOTE: Wattpad loads chapter lists dynamically with JavaScript.
 * For production use, consider using Playwright/Puppeteer for full browser rendering.
 * This implementation works with server-side rendered content only.
 */

import { ContentProvider, type ContentMetadata, type ChapterRef } from './ContentProvider.js';
import sanitizeHtml from 'sanitize-html';

const SITE = 'wattpad.com';

export class WattpadProvider extends ContentProvider {
  canHandle(url: string): boolean {
    return url.includes(SITE);
  }

  async extractMetadata(url: string): Promise<ContentMetadata> {
    console.log('[WattpadProvider] Extracting metadata from:', url);
    
    // Use Playwright to render JavaScript-loaded content
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for story info to load
      try {
        await page.waitForSelector('h1, .story-info, [class*="title"]', { timeout: 10000 });
      } catch {
        console.log('[WattpadProvider] No story info elements found after waiting');
      }
      
      const html = await page.content();
      await browser.close();
      
      // Now parse with Cheerio
      const { load } = await import('cheerio');
      const $ = load(html);

      // Wattpad stores data in a script tag
      let title = $('h1.story-info__title, h1').first().text().trim();
      let author: string | null = null;
      let synopsis: string | null = null;
      let coverImageUrl: string | null = null;
      const tags: string[] = [];

      // Try to extract from meta tags first
      if (!title) {
        title = $('meta[property="og:title"]').attr('content')?.trim() || 'Unknown Title';
      }

      author = $('.author-info__username a, a.username').first().text().trim()
        || $('.author-info .username').text().trim()
        || null;

      synopsis = $('.description-text p').text().trim()
        || $('.description').text().trim()
        || $('meta[property="og:description"]').attr('content')?.trim()
        || $('meta[name="description"]').attr('content')?.trim()
        || null;

      coverImageUrl = $('img.cover-image, img.story-cover__img').attr('src')
        || $('meta[property="og:image"]').attr('content')
        || null;

      // Extract tags from tag links
      $('ul.tag-items li a, .tags a, a.tag').each((_: number, el) => {
        const tag = $(el).text().trim();
        if (tag && tag.length > 0 && tag !== '#') {
          tags.push(tag.replace(/^#/, ''));
        }
      });

      // Check if completed
      const completedBadge = $('.story-badge-completed, .completed-badge').length > 0;
      const statusText = $('.story-stats').text().toLowerCase();
      const isCompleted = completedBadge || statusText.includes('completed') || statusText.includes('complete');
      const status: ContentMetadata['status'] = isCompleted ? 'COMPLETED' : 'ONGOING';

      console.log(`[WattpadProvider] Extracted metadata: title="${title}", author="${author}", tags=${tags.length}`);

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
      
    } catch (error) {
      await browser.close();
      console.error('[WattpadProvider] Error extracting metadata:', error);
      throw error;
    }
  }

  async extractChapterList(url: string): Promise<ChapterRef[]> {
    console.log('[WattpadProvider] Extracting chapter list from:', url);
    
    // Use Playwright to render JavaScript-loaded content
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wattpad modern UI requires clicking to see chapters
      // Try to find and click "Table of Contents" or "Story Parts" button
      const tocSelectors = [
        'button:has-text("Table of Contents")',
        'button:has-text("Story Parts")',
        'button:has-text("Chapters")',
        '[aria-label*="Table"]',
        '[aria-label*="Parts"]',
        '[aria-label*="Chapter"]',
        'button[class*="toc"]',
        'button[class*="parts"]',
        'a:has-text("Table of Contents")',
        // Try more generic buttons
        'button:has-text("Read")',
        '[class*="story"] button',
      ];
      
      let clicked = false;
      for (const selector of tocSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`[WattpadProvider] Found button with selector: ${selector}`);
            const buttonText = await button.textContent();
            console.log(`[WattpadProvider] Button text: "${buttonText}"`);
            await button.click();
            clicked = true;
            await page.waitForTimeout(2000); // Wait for content to load
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!clicked) {
        console.log('[WattpadProvider] No TOC button found, trying to scroll to load chapters');
        // Scroll down to trigger lazy loading
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        // Scroll back up
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);
      }
      
      // Get ALL links and log them for debugging
      const allLinks = await page.$$eval('a[href]', links => 
        links
          .map(l => ({
            text: l.textContent?.trim() || '',
            href: l.getAttribute('href') || '',
          }))
          .filter(l => l.href.includes('wattpad.com'))
          .slice(0, 30) // First 30 links
      );
      console.log('[WattpadProvider] All Wattpad links on page:', JSON.stringify(allLinks, null, 2));
      
      // Get all links that look like chapter URLs - be more lenient
      const chapterData = await page.$$eval('a[href]', links => 
        links
          .map(l => ({
            text: l.textContent?.trim() || '',
            href: l.getAttribute('href') || '',
          }))
          .filter(l => {
            // Look for any link that has digits in the path
            // Wattpad chapters can be: /story/ID or just /ID-name
            return l.href.match(/\/\d+(-[^/\s]+)?/) !== null;
          })
      );
      
      console.log(`[WattpadProvider] Found ${chapterData.length} potential chapter links`);
      if (chapterData.length > 0) {
        console.log('[WattpadProvider] Sample chapters:', JSON.stringify(chapterData.slice(0, 10), null, 2));
      }
      
      await browser.close();
      
      const chapters: ChapterRef[] = [];
      const seenUrls = new Set<string>();
      
      // Extract story ID from the URL we're scraping
      const storyIdMatch = url.match(/\/story\/(\d+)/);
      const storyId = storyIdMatch ? storyIdMatch[1] : null;
      console.log(`[WattpadProvider] Story ID: ${storyId}`);
      
      for (const data of chapterData) {
        let chapterUrl = data.href;
        
        // Build full URL if relative
        if (!chapterUrl.startsWith('http')) {
          chapterUrl = chapterUrl.startsWith('/')
            ? `https://www.wattpad.com${chapterUrl}`
            : `https://www.wattpad.com/${chapterUrl}`;
        }
        
        // Skip if not from this story
        if (storyId && !chapterUrl.includes(storyId)) {
          continue;
        }
        
        // Skip if it's the story URL itself (no chapter ID)
        if (storyId && (chapterUrl.endsWith(storyId) || chapterUrl.endsWith(`${storyId}-`))) {
          continue;
        }
        
        // Avoid duplicates
        if (seenUrls.has(chapterUrl)) continue;
        seenUrls.add(chapterUrl);
        
        let title = data.text;
        // Remove "Read" prefix if present
        title = title.replace(/^Read\s+/i, '');
        
        // Skip if no meaningful title
        if (!title || title.length < 2) continue;
        
        chapters.push({
          number: chapters.length + 1,
          title: title || `Chapter ${chapters.length + 1}`,
          url: chapterUrl,
          publishedAt: null,
        });
        
        console.log(`[WattpadProvider] Chapter ${chapters.length}: ${title} -> ${chapterUrl}`);
      }

      console.log(`[WattpadProvider] Final chapter count: ${chapters.length}`);
      return chapters;
      
    } catch (error) {
      await browser.close();
      console.error('[WattpadProvider] Error extracting chapters:', error);
      throw error;
    }
  }

  async extractChapterBody(chapterUrl: string): Promise<string> {
    console.log('[WattpadProvider] Extracting chapter body from:', chapterUrl);
    
    // Use Playwright to render JavaScript-loaded content
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(chapterUrl, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for chapter content to load
      try {
        await page.waitForSelector('pre, .part-content, [class*="content"]', { timeout: 10000 });
      } catch {
        console.log('[WattpadProvider] No content elements found after waiting');
      }
      
      const html = await page.content();
      await browser.close();
      
      // Now parse with Cheerio
      const { load } = await import('cheerio');
      const $ = load(html);

      // Wattpad chapter content can be in various containers
      const bodySelectors = [
        'pre.part-content',
        '.part-content-container pre',
        'div[data-page-id] pre',
        '.page pre',
        'pre',
      ];

      let bodyContainer = $('');
      
      for (const selector of bodySelectors) {
        bodyContainer = $(selector).first();
        if (bodyContainer.length > 0) {
          console.log(`[WattpadProvider] Found chapter body using selector: ${selector}`);
          break;
        }
      }
      
      if (bodyContainer.length === 0) {
        throw new Error(`Could not find chapter body at ${chapterUrl}`);
      }

      // Remove unwanted elements
      bodyContainer.find('script, .ad, .advertisement, [class*="sponsor"], [class*="promo"]').remove();

      // Get the HTML content and convert line breaks
      let bodyHtml = bodyContainer.html()?.trim() ?? '';
      
      // Wattpad uses <p> tags within <pre>, convert to proper HTML
      bodyHtml = bodyHtml.replace(/<p>/g, '<p>').replace(/<\/p>/g, '</p>');
      // Convert line breaks to paragraphs if they're plain text
      if (!bodyHtml.includes('<p>')) {
        const lines = bodyHtml.split(/\n\n+/);
        bodyHtml = lines.map(line => `<p>${line.trim()}</p>`).join('\n');
      }

      // Sanitize the HTML
      bodyHtml = sanitizeHtml(bodyHtml, {
        allowedTags: [
          'p', 'br', 'strong', 'em', 'u', 'b', 'i', 's', 'span',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'a', 'img',
          'div',
        ],
        allowedAttributes: {
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'title'],
          'div': ['class'],
          'span': ['class'],
        },
        allowedClasses: {
          'div': ['chapter-*', 'content-*'],
          'span': ['highlight', 'emphasis'],
        },
      });

      console.log(`[WattpadProvider] Extracted ${bodyHtml.length} characters of chapter content`);
      return bodyHtml;
      
    } catch (error) {
      await browser.close();
      console.error('[WattpadProvider] Error extracting chapter body:', error);
      throw error;
    }
  }

  isImageContent(): boolean {
    return false; // Wattpad only has text content
  }

  private async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ArcaniumBot/1.0 (reading archive; contact@arcanium.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.text();
  }
}
