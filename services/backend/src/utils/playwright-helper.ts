/**
 * Playwright Helper — Shared utilities for browser-based scraping
 * 
 * Handles anti-bot protection, JavaScript rendering, and Cloudflare bypass.
 * Reusable across all providers that need Playwright.
 */

import type { Browser, Page, BrowserContext } from 'playwright';

let browserInstance: Browser | null = null;

/**
 * Get or create a shared browser instance (headless Chrome)
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;

  const { chromium } = await import('playwright');
  browserInstance = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });

  // Cleanup on process exit
  process.on('exit', () => {
    browserInstance?.close().catch(() => {});
  });

  return browserInstance;
}

/**
 * Create a new browser context with realistic fingerprint
 */
export async function createBrowserContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: [],
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  });
}

/**
 * Fetch HTML content using Playwright (bypasses Cloudflare and anti-bot)
 */
export async function fetchWithPlaywright(
  url: string,
  options: {
    waitForSelector?: string;
    waitForTimeout?: number;
    extractData?: (page: Page) => Promise<any>;
  } = {}
): Promise<string> {
  const context = await createBrowserContext();
  const page = await context.newPage();

  try {
    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Wait for specific selector if provided
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: 10_000 });
      } catch {
        // Selector not found, continue anyway
      }
    }

    // Wait additional time for dynamic content
    if (options.waitForTimeout) {
      await page.waitForTimeout(options.waitForTimeout);
    }

    // Extract additional data if handler provided
    if (options.extractData) {
      await options.extractData(page);
    }

    // Get the HTML content
    const html = await page.content();
    return html;
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Extract JSON data from script tags using Playwright
 */
export async function extractJsonWithPlaywright<T = any>(
  url: string,
  scriptSelector: string = 'script#__NEXT_DATA__'
): Promise<T | null> {
  const context = await createBrowserContext();
  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Extract JSON from script tag
    const jsonData = await page.evaluate((selector) => {
      const script = document.querySelector(selector);
      if (!script?.textContent) return null;
      try {
        return JSON.parse(script.textContent);
      } catch {
        return null;
      }
    }, scriptSelector);

    return jsonData as T;
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Close the shared browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
