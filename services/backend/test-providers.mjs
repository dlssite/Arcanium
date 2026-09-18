/**
 * test-providers.mjs — Quick test script for new providers
 * Tests metadata extraction for all new providers without full ingestion.
 *
 * Run:  node --loader ts-node/esm test-providers.mjs
 */

import { getProvider } from './dist/scraper/parsers/index.js';

const TEST_URLS = [
  // ComicK — valid slug with numeric prefix
{ provider: 'ComicK',        url: 'https://comick.io/comic/02-one-piece' },
// AsuraScans — real domain is asurascans.com/comics/
{ provider: 'AsuraScans',    url: 'https://asurascans.com/comics/nano-machine-b4884f07' },
// AO3 — well-known multi-chapter work
{ provider: 'AO3',           url: 'https://archiveofourown.org/works/6953674' },
// Webtoon
{ provider: 'Webtoon',       url: 'https://www.webtoons.com/en/fantasy/tower-of-god/list?title_no=95' },
// NovelUpdates
{ provider: 'NovelUpdates',  url: 'https://www.novelupdates.com/series/solo-leveling' },
// Gutenberg
{ provider: 'Gutenberg',     url: 'https://www.gutenberg.org/ebooks/1342' },
// Tapas
{ provider: 'Tapas',         url: 'https://tapas.io/series/unordinary' },
];

console.log('🧪 Testing New Providers...\n');

for (const test of TEST_URLS) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${test.provider}`);
  console.log(`URL: ${test.url}`);
  console.log('='.repeat(70));

  try {
    const provider = getProvider(test.url);
    console.log(`✅ Provider matched: ${provider.constructor.name}`);

    // Test canHandle
    if (!provider.canHandle(test.url)) {
      throw new Error('Provider returned false for canHandle()');
    }

    // Test metadata extraction
    console.log('⏳ Extracting metadata...');
    const metadata = await provider.extractMetadata(test.url);
    
    console.log('\n📊 Metadata:');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Author: ${metadata.author || 'N/A'}`);
    console.log(`   Type: ${metadata.type}`);
    console.log(`   Status: ${metadata.status}`);
    console.log(`   Synopsis: ${metadata.synopsis?.substring(0, 100) || 'N/A'}...`);
    console.log(`   Genres: ${metadata.genres.join(', ') || 'None'}`);
    console.log(`   Cover: ${metadata.coverImageUrl ? '✓' : '✗'}`);

    // Test chapter list (first 5)
    console.log('\n⏳ Extracting chapter list...');
    const chapters = await provider.extractChapterList(test.url);
    console.log(`\n📚 Chapters: ${chapters.length} total`);
    
    if (chapters.length > 0) {
      console.log('   First 5:');
      chapters.slice(0, 5).forEach((ch) => {
        console.log(`     ${ch.number}. ${ch.title || 'Untitled'}`);
      });
    }

    console.log(`\n✅ ${test.provider} - PASSED`);

  } catch (error) {
    console.error(`\n❌ ${test.provider} - FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack?.split('\n')[1]?.trim()}`);
  }
}

console.log('\n\n' + '='.repeat(70));
console.log('🏁 Testing Complete!');
console.log('='.repeat(70));
