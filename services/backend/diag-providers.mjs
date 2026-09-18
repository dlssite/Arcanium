/**
 * Diagnostic — inspect what Playwright actually fetches for each provider
 */
import { fetchWithPlaywright } from './dist/utils/playwright-helper.js';

async function inspect(label, url) {
  console.log(`\n${'='.repeat(60)}\n${label}\n${url}\n${'='.repeat(60)}`);
  try {
    const html = await fetchWithPlaywright(url, { waitForTimeout: 3000 });

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    console.log('  <title>:', titleMatch?.[1]?.trim());

    const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i)
      ?? html.match(/content="([^"]+)"\s+property="og:title"/i);
    console.log('  og:title:', ogTitle?.[1]);

    const h1s = [...html.matchAll(/<h1[^>]*>([^<]{1,80})<\/h1>/gi)].map(m => m[1].trim()).slice(0, 3);
    console.log('  h1s:', h1s);

    const chLinks = [...html.matchAll(/href="([^"]*\/chapter\/[^"]{1,60})"/gi)].slice(0, 3).map(m => m[1]);
    const epLinks = [...html.matchAll(/href="([^"]*\/episode\/[^"]{1,60})"/gi)]
      .filter(m => !m[1].includes('m.tapas'))
      .slice(0, 3).map(m => m[1]);
    console.log('  /chapter/ links:', chLinks);
    console.log('  /episode/ links:', epLinks);

  } catch (e) {
    console.log('  ERROR:', e.message);
  }
}

// ComicK — try comick.app instead
await inspect('ComicK (comick.app)', 'https://comick.app/comic/one-piece');

// AsuraScans — try actual series page with correct slug
await inspect('AsuraScans (nano-machine correct slug)', 'https://asuracomic.net/series/nano-machine-01081e99');

// Tapas — confirmed episodes in HTML
await inspect('Tapas', 'https://tapas.io/series/unordinary');

process.exit(0);
