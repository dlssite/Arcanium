import { createBrowserContext } from './dist/utils/playwright-helper.js';

async function check(label, url) {
  console.log(`\n=== ${label} ===\n${url}`);
  const ctx = await createBrowserContext();
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const title = await page.title();
    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => 'N/A');
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content')).catch(() => 'N/A');
    console.log('  title:', title);
    console.log('  h1:', h1);
    console.log('  og:title:', ogTitle);
    // Episode links for Tapas
    if (url.includes('tapas')) {
      const epLinks = await page.$$eval('a[href*="/episode/"]', els =>
        els.filter(e => !e.href.includes('m.tapas')).slice(0,5).map(e => ({ href: e.href, text: e.textContent?.trim().slice(0,40) }))
      );
      console.log('  episode links:', epLinks);
    }
    // Chapter links for AsuraScans
    if (url.includes('asura')) {
      const chLinks = await page.$$eval('a[href*="/chapter/"]', els =>
        els.slice(0,5).map(e => ({ href: e.href, text: e.textContent?.trim().slice(0,40) }))
      );
      console.log('  chapter links:', chLinks);
    }
    // NU selectors
    if (url.includes('novelupdates')) {
      const nuTitle = await page.$eval('.seriestitlenu', el => el.textContent?.trim()).catch(() => 'NOT FOUND');
      console.log('  .seriestitlenu:', nuTitle);
    }
    // ComicK h1
    if (url.includes('comick')) {
      const allH1 = await page.$$eval('h1', els => els.map(e => e.textContent?.trim().slice(0,80)));
      console.log('  all h1s:', allH1);
    }
  } finally {
    await page.close();
    await ctx.close();
  }
}

await check('ComicK', 'https://comick.io/comic/one-piece');
await check('AsuraScans', 'https://asuracomic.net/series/nano-machine-01081e99');
await check('NovelUpdates', 'https://www.novelupdates.com/series/solo-leveling');
await check('Tapas', 'https://tapas.io/series/unordinary');
process.exit(0);
