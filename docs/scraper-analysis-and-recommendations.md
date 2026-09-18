# Scraper & Provider Analysis and Recommendations

## Executive Summary

This document analyzes Arcanium's current content provider architecture and recommends new providers to significantly expand coverage for manga, manhwa, webcomics, comics, novels, and non-fiction books.

**Current Status:**
- 5 active providers
- Good foundation with REST APIs and HTML scraping
- Strong compliance (robots.txt, HTML sanitization)
- Limited coverage for manga/manhwa/webcomics

**Recommendations:**
- Add 15+ new high-priority providers
- Implement specialized scrapers for manga aggregators
- Add comic book and graphic novel sources
- Expand novel coverage beyond Wattpad

---

## Current Provider Analysis

### ✅ Existing Providers (5)

#### 1. **MangaDexProvider** ⭐⭐⭐⭐⭐
- **Source:** mangadex.org (REST API v5)
- **Content Type:** MANGA
- **Coverage:** Excellent for manga
- **Strengths:**
  - Official REST API (reliable, fast)
  - Multi-language support
  - Large catalog (70k+ titles)
  - Image CDN with quality options
  - Active community scanlations
- **Limitations:**
  - Manga only (no manhwa-specific features)
  - Depends on scanlation groups uploading
- **Status:** Keep and optimize ✅

#### 2. **WattpadProvider** ⭐⭐⭐
- **Source:** wattpad.com
- **Content Type:** WEB_NOVEL
- **Coverage:** Good for user-generated fiction
- **Strengths:**
  - Massive catalog (90M+ users)
  - Diverse genres
  - Active community
- **Weaknesses:**
  - Uses Playwright (heavy, slow)
  - JavaScript-heavy site (brittle selectors)
  - Quality varies widely
- **Improvements Needed:**
  - Cache rendered pages
  - Add retry logic
  - Consider Wattpad API (if available)
- **Status:** Keep with improvements ⚠️

#### 3. **OpenLibraryProvider** ⭐⭐⭐⭐
- **Source:** openlibrary.org (REST API)
- **Content Type:** EBOOK (public domain)
- **Coverage:** Limited to public domain works
- **Strengths:**
  - Official API
  - Internet Archive integration
  - Metadata-rich
- **Limitations:**
  - Public domain only (pre-1928 works)
  - No modern fiction/non-fiction
  - Limited full-text availability
- **Status:** Keep for classic literature ✅

#### 4. **RSSFeedProvider** ⭐⭐⭐⭐
- **Source:** Generic RSS/Atom feeds
- **Content Type:** WEB_NOVEL
- **Strengths:**
  - Universal compatibility
  - Handles WordPress, ScribbleHub, etc.
  - Lightweight, fast
- **Limitations:**
  - Depends on sites offering feeds
  - Inconsistent content structure
- **Status:** Keep as fallback ✅

#### 5. **WebScraperProvider** ⭐⭐⭐
- **Source:** Generic HTML scraper (fallback)
- **Content Type:** WEB_NOVEL
- **Strengths:**
  - Royal Road specialized support
  - Mozilla Readability integration
  - Robots.txt compliance
  - HTML sanitization
- **Limitations:**
  - Last-resort fallback only
  - No image content support
  - Brittle for non-standard layouts
- **Status:** Keep as fallback ✅

---

## Critical Gaps Identified

### 📚 Manga & Manhwa
- **Current Coverage:** MangaDex only
- **Gap:** Missing major aggregators, official sources, and Korean/Chinese platforms

### 📖 Comics & Graphic Novels
- **Current Coverage:** None
- **Gap:** No Western comics, graphic novels, or webtoon platforms

### 📕 Modern Novels & Non-Fiction
- **Current Coverage:** Wattpad (amateur), OpenLibrary (public domain)
- **Gap:** No modern published works, no non-fiction, no light novels

### 🌐 Web Serials
- **Current Coverage:** RSS feeds, Royal Road (via WebScraper)
- **Gap:** Missing major platforms like Scribble Hub, Archive of Our Own

---

## Recommended New Providers (Priority Ordered)

### 🔥 TIER 1: High Priority - Must Have

#### 1. **ComicKProvider** (MangaDex-like Aggregator)
```typescript
/**
 * ComicKProvider — comick.io / comick.app
 * REST API available at api.comick.fun
 */
```
- **Content Type:** MANGA, MANHWA, WEBTOON, COMIC
- **Why:**
  - Comprehensive aggregator (all Asian comics)
  - Official REST API
  - Manhwa-focused (fills MangaDex gap)
  - Fast CDN
  - 100k+ titles
- **Implementation:** Similar to MangaDexProvider (REST API)
- **Difficulty:** ⭐ Easy (documented API)

#### 2. **WebtoonProvider** (Naver Webtoon)
```typescript
/**
 * WebtoonProvider — webtoons.com
 * Official Naver WEBTOON platform
 */
```
- **Content Type:** WEBTOON
- **Why:**
  - Official platform (legal, reliable)
  - Highest quality webtoons
  - 1000+ titles
  - Multi-language support
  - Mobile-optimized images
- **Implementation:** HTML scraping + JSON API endpoints
- **Difficulty:** ⭐⭐ Medium (no official public API, but structured data)
- **Note:** Respect copyright, link to official chapters

#### 3. **TapasProvider**
```typescript
/**
 * TapasProvider — tapas.io
 * Web comics and novels platform
 */
```
- **Content Type:** WEBTOON, COMIC, WEB_NOVEL
- **Why:**
  - Western comic focus
  - Original content
  - Both free and premium chapters
  - 8000+ series
- **Implementation:** HTML scraping or GraphQL API
- **Difficulty:** ⭐⭐ Medium

#### 4. **NovelUpdatesProvider**
```typescript
/**
 * NovelUpdatesProvider — novelupdates.com
 * Light novel tracking and aggregator
 */
```
- **Content Type:** LIGHT_NOVEL, WEB_NOVEL
- **Why:**
  - Comprehensive light novel database
  - Links to translation sites
  - Chapter tracking
  - 40k+ novels (Asian focus)
- **Implementation:** HTML scraping + structured data
- **Difficulty:** ⭐⭐ Medium
- **Note:** Links to translator sites, not direct host

#### 5. **ArchiveOfOurOwnProvider** (AO3)
```typescript
/**
 * AO3Provider — archiveofourown.org
 * Largest fan fiction archive
 */
```
- **Content Type:** WEB_NOVEL (fan fiction)
- **Why:**
  - 10M+ works
  - Excellent tagging system
  - HTML export available
  - API-friendly structure
- **Implementation:** HTML scraping (well-structured)
- **Difficulty:** ⭐ Easy
- **Legal:** Non-commercial use allowed

#### 6. **ReadComicOnlineProvider**
```typescript
/**
 * ReadComicOnlineProvider — readcomiconline.li
 * Western comics aggregator
 */
```
- **Content Type:** COMIC
- **Why:**
  - Marvel, DC, Image, Dark Horse
  - 50k+ comics
  - Full issue scans
- **Implementation:** HTML scraping (structured)
- **Difficulty:** ⭐⭐ Medium
- **Note:** Gray area legally, aggregate links only

---

### ⭐ TIER 2: Important - Should Have

#### 7. **MangakakalotProvider** / **ManganelooProvider**
```typescript
/**
 * ManganatoProvider — manganato.com (formerly Manganelo)
 * Large manga aggregator
 */
```
- **Content Type:** MANGA, MANHWA
- **Why:**
  - Huge catalog
  - Fast updates
  - Multiple languages
- **Implementation:** HTML scraping
- **Difficulty:** ⭐⭐ Medium
- **Note:** Aggregator, copyright considerations

#### 8. **AsuraScansProvider**
```typescript
/**
 * AsuraScansProvider — asuracomic.net
 * Popular scanlation group
 */
```
- **Content Type:** MANGA, MANHWA
- **Why:**
  - High-quality scans
  - Fast releases
  - Popular series
- **Implementation:** HTML scraping
- **Difficulty:** ⭐⭐ Medium

#### 9. **ScribbleHubProvider**
```typescript
/**
 * ScribbleHubProvider — scribblehub.com
 * Web novel and fan fiction platform
 */
```
- **Content Type:** WEB_NOVEL, LIGHT_NOVEL
- **Why:**
  - 30k+ novels
  - Advanced tagging
  - Original and translated works
  - RSS feeds available
- **Implementation:** HTML scraping + RSS
- **Difficulty:** ⭐ Easy
- **Synergy:** Can reuse RSSFeedProvider logic

#### 10. **FanFictionNetProvider**
```typescript
/**
 * FFNetProvider — fanfiction.net
 * Original fan fiction platform
 */
```
- **Content Type:** WEB_NOVEL
- **Why:**
  - 12M+ stories
  - Oldest platform (1998)
  - Still active community
- **Implementation:** HTML scraping (legacy but stable)
- **Difficulty:** ⭐ Easy

#### 11. **WebNovelProvider** (Qidian International)
```typescript
/**
 * WebNovelProvider — webnovel.com
 * Official Qidian English platform
 */
```
- **Content Type:** WEB_NOVEL, LIGHT_NOVEL
- **Why:**
  - Official Chinese webnovel translations
  - Huge catalog
  - Both free and premium
- **Implementation:** HTML scraping or API
- **Difficulty:** ⭐⭐⭐ Hard (anti-scraping measures)

#### 12. **GutenbergProvider**
```typescript
/**
 * GutenbergProvider — gutenberg.org
 * Public domain ebooks
 */
```
- **Content Type:** EBOOK (classic literature, non-fiction)
- **Why:**
  - 70k+ free ebooks
  - Public domain classics
  - Multiple formats (HTML, EPUB, TXT)
  - API available
- **Implementation:** REST API + RSS
- **Difficulty:** ⭐ Easy
- **Synergy:** Complements OpenLibrary

---

### 💡 TIER 3: Nice to Have - Future Expansion

#### 13. **MangaPlusProvider** (Official Shueisha)
```typescript
/**
 * MangaPlusProvider — mangaplus.shueisha.co.jp
 * Official Shueisha manga platform
 */
```
- **Content Type:** MANGA
- **Why:**
  - Official source (legal)
  - Simultaneous publication
  - Jump titles (One Piece, etc.)
- **Implementation:** API available
- **Difficulty:** ⭐⭐ Medium
- **Note:** Region restrictions may apply

#### 14. **ComicFuryProvider**
```typescript
/**
 * ComicFuryProvider — comicfury.com
 * Independent webcomic hosting
 */
```
- **Content Type:** WEBCOMIC, COMIC
- **Why:**
  - Independent creators
  - 1000s of webcomics
  - RSS feeds
- **Implementation:** HTML scraping + RSS
- **Difficulty:** ⭐ Easy

#### 15. **ComiXologyProvider** (Amazon Comics)
```typescript
/**
 * ComiXologyProvider — comixology.com
 * Digital comics storefront
 */
```
- **Content Type:** COMIC
- **Why:**
  - Official digital comics
  - All major publishers
  - Highest quality
- **Limitations:**
  - Paid content only
  - DRM protected
  - API access difficult
- **Implementation:** Metadata only (link to purchase)
- **Difficulty:** ⭐⭐⭐⭐ Very Hard

#### 16. **LibGenProvider** (Library Genesis)
```typescript
/**
 * LibGenProvider — libgen.is / libgen.rs
 * Academic and non-fiction ebooks
 */
```
- **Content Type:** EBOOK (academic, non-fiction)
- **Why:**
  - Largest non-fiction repository
  - Academic textbooks
  - Scientific papers
  - 5M+ books
- **Implementation:** HTML scraping + API
- **Difficulty:** ⭐⭐ Medium
- **Legal:** Gray area - shadow library
- **Recommendation:** Metadata/links only, respect copyright

#### 17. **GoogleBooksProvider**
```typescript
/**
 * GoogleBooksProvider — books.google.com
 * Google Books API
 */
```
- **Content Type:** EBOOK (preview/full text)
- **Why:**
  - Official API
  - Massive catalog
  - Metadata rich
  - Preview pages available
- **Implementation:** REST API
- **Difficulty:** ⭐ Easy
- **Limitations:** Most books are preview-only

---

## Implementation Recommendations

### Phase 1: Quick Wins (Week 1-2)
1. **ComicKProvider** - Fill manhwa gap
2. **ArchiveOfOurOwnProvider** - Easy implementation, huge catalog
3. **ScribbleHubProvider** - Reuse RSS logic
4. **GutenbergProvider** - Official API, non-fiction coverage

**Impact:** +80k manga/manhwa, +10M fan fiction, +70k classics

### Phase 2: Core Features (Week 3-4)
5. **WebtoonProvider** - Official webtoons
6. **NovelUpdatesProvider** - Light novel tracking
7. **TapasProvider** - Western comics
8. **FanFictionNetProvider** - Expand fiction catalog

**Impact:** +1k webtoons, +40k light novels, +8k comics, +12M stories

### Phase 3: Expansion (Month 2)
9. **ManganatoProvider** - Expand manga coverage
10. **AsuraScansProvider** - Popular scanlations
11. **WebNovelProvider** - Chinese webnovels
12. **MangaPlusProvider** - Official manga

**Impact:** +100k manga/manhwa, official sources

### Phase 4: Future (Month 3+)
13-17. Remaining providers based on user demand

---

## Technical Implementation Guidelines

### 1. Provider Architecture Pattern

```typescript
// Example: ComicKProvider structure
export class ComicKProvider extends ContentProvider {
  private readonly API_BASE = 'https://api.comick.fun';
  private readonly CDN_BASE = 'https://meo.comick.pictures';
  
  canHandle(url: string): boolean {
    return url.includes('comick.io') || url.includes('comick.app');
  }
  
  override isImageType(): boolean {
    return true; // For manga/comics
  }
  
  async extractMetadata(url: string): Promise<ContentMetadata> {
    // REST API implementation
  }
  
  async extractChapterList(url: string): Promise<ChapterRef[]> {
    // Paginated chapter fetching
  }
  
  async extractChapterBody(sourceUrl: string): Promise<string> {
    // Return JSON.stringify(imageUrls[]) for image content
  }
}
```

### 2. HTML Scraping Best Practices

**For Wattpad-like heavy JS sites:**
```typescript
// Use Playwright sparingly - it's slow
// Cache rendered HTML
// Implement request throttling
// Add retry logic with exponential backoff
```

**For static sites:**
```typescript
// Prefer Cheerio over Playwright
// Use robots.txt compliance (already implemented)
// Sanitize all HTML output (already implemented)
// Cache selectors in constants
```

### 3. Rate Limiting & Caching

```typescript
// Add to each provider
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async throttle(key: string, maxPerMinute: number): Promise<void> {
    // Implementation
  }
}

// Usage
private limiter = new RateLimiter();
await this.limiter.throttle(this.API_BASE, 60); // 60 req/min
```

### 4. Error Handling

```typescript
// Implement provider-specific errors
export class ProviderRateLimitError extends Error {
  constructor(provider: string, retryAfter?: number) {
    super(`${provider} rate limit exceeded`);
    this.name = 'ProviderRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ProviderContentNotFoundError extends Error {
  constructor(url: string) {
    super(`Content not found: ${url}`);
    this.name = 'ProviderContentNotFoundError';
  }
}
```

### 5. Testing Strategy

```typescript
// Unit tests for each provider
describe('ComicKProvider', () => {
  it('should handle comick.io URLs', () => {
    const provider = new ComicKProvider();
    expect(provider.canHandle('https://comick.io/comic/123')).toBe(true);
  });
  
  it('should extract metadata', async () => {
    const metadata = await provider.extractMetadata(SAMPLE_URL);
    expect(metadata.title).toBeDefined();
    expect(metadata.type).toBe('MANHWA');
  });
  
  // Add integration tests with real URLs
  // Add mock API response tests
});
```

---

## Legal & Ethical Considerations

### ✅ Safe Sources (Use Freely)
- **MangaDex** - Non-profit, respects takedowns
- **Webtoon** - Official platform
- **Tapas** - Official platform
- **Archive of Our Own** - Non-commercial allowed
- **Open Library** - Non-profit, legal
- **Gutenberg** - Public domain
- **Google Books** - Official API
- **MangaPlus** - Official publisher

### ⚠️ Gray Area (Use with Caution)
- **Wattpad** - Check ToS, respect robots.txt
- **Royal Road** - Same as above
- **ScribbleHub** - Reader-friendly, but verify
- **Novel Updates** - Aggregator, links only
- **FanFiction.Net** - Non-commercial use typically OK

### ❌ Risky (Avoid or Metadata Only)
- **ReadComicOnline** - Piracy aggregator
- **Manganato** - Copyright issues
- **Library Genesis** - Shadow library
- **Asura Scans** - Fan scanlations (gray area)

### Recommendations:
1. **Prioritize official sources** (Webtoon, MangaPlus, Tapas)
2. **Respect robots.txt** (already implemented ✅)
3. **Honor rate limits** (implement per-provider)
4. **Add DMCA compliance** (takedown procedure)
5. **Link to official sources** when possible
6. **Don't cache copyrighted images** beyond reasonable caching
7. **Attribute sources** in UI clearly

---

## Immediate Action Items

### This Week:
1. ✅ Review this analysis
2. ⚠️ Improve WattpadProvider (add caching, retry logic)
3. 🆕 Implement ComicKProvider (high-priority manhwa gap)
4. 🆕 Implement GutenbergProvider (easy win, non-fiction)

### Next Week:
5. 🆕 Implement ArchiveOfOurOwnProvider (10M works)
6. 🆕 Implement ScribbleHubProvider (reuse RSS logic)
7. 📝 Add rate limiting infrastructure
8. 📝 Add provider-specific error handling

### Month 1:
9. 🆕 Implement WebtoonProvider (official webtoons)
10. 🆕 Implement NovelUpdatesProvider (light novels)
11. 🆕 Implement TapasProvider (western comics)
12. 📝 Add comprehensive testing
13. 📝 Document each provider

### Ongoing:
- Monitor provider reliability
- Handle API changes
- Respond to DMCA requests
- Add user-requested sources

---

## Success Metrics

### Coverage Goals (6 months):
- **Manga/Manhwa:** 200k+ titles (currently: 70k)
- **Webtoons:** 5k+ titles (currently: 0)
- **Web Novels:** 20M+ works (currently: 90M user-gen only)
- **Comics:** 50k+ issues (currently: 0)
- **Ebooks:** 200k+ books (currently: limited public domain)
- **Light Novels:** 50k+ titles (currently: indirect via Novel Updates)

### Quality Metrics:
- **Uptime:** 99%+ per provider
- **Scrape Success Rate:** 95%+
- **Average Fetch Time:** <3s for metadata, <5s for chapters
- **Error Rate:** <5%

### User Satisfaction:
- **Content Availability:** 90%+ of user requests covered
- **Update Speed:** New chapters within 24h
- **Image Quality:** HD when available
- **Load Times:** <2s for chapter view

---

## Appendix: Provider Priority Matrix

| Provider | Priority | Difficulty | Impact | Legal Risk | Implementation Time |
|----------|----------|------------|--------|------------|---------------------|
| ComicK | 🔥 High | ⭐ Easy | ⭐⭐⭐⭐⭐ | 🟡 Low | 2-3 days |
| Webtoon | 🔥 High | ⭐⭐ Medium | ⭐⭐⭐⭐⭐ | 🟢 None | 3-5 days |
| Tapas | 🔥 High | ⭐⭐ Medium | ⭐⭐⭐⭐ | 🟢 None | 3-5 days |
| Novel Updates | 🔥 High | ⭐⭐ Medium | ⭐⭐⭐⭐ | 🟡 Low | 2-3 days |
| AO3 | 🔥 High | ⭐ Easy | ⭐⭐⭐⭐⭐ | 🟢 None | 1-2 days |
| Gutenberg | ⭐ Medium | ⭐ Easy | ⭐⭐⭐ | 🟢 None | 1-2 days |
| ScribbleHub | ⭐ Medium | ⭐ Easy | ⭐⭐⭐⭐ | 🟢 None | 1-2 days |
| FFNet | ⭐ Medium | ⭐ Easy | ⭐⭐⭐⭐ | 🟡 Low | 2-3 days |
| Manganato | ⭐ Medium | ⭐⭐ Medium | ⭐⭐⭐⭐ | 🔴 High | 3-4 days |
| AsuraScans | ⭐ Medium | ⭐⭐ Medium | ⭐⭐⭐ | 🟡 Medium | 3-4 days |
| WebNovel | ⭐ Low | ⭐⭐⭐ Hard | ⭐⭐⭐ | 🟡 Low | 1 week |
| MangaPlus | ⭐ Low | ⭐⭐ Medium | ⭐⭐⭐ | 🟢 None | 3-5 days |
| LibGen | 💡 Future | ⭐⭐ Medium | ⭐⭐⭐⭐⭐ | 🔴 High | 3-5 days |
| Google Books | 💡 Future | ⭐ Easy | ⭐⭐⭐ | 🟢 None | 2-3 days |

**Legend:**
- 🔥 High Priority / ⭐ Medium / 💡 Low/Future
- ⭐ Difficulty: ⭐ Easy → ⭐⭐⭐⭐ Very Hard
- Legal Risk: 🟢 None / 🟡 Low / 🔴 High

---

## Conclusion

Your current provider architecture is **solid and well-designed**. The main gaps are in content coverage, not architecture. By implementing the recommended providers in phases, you can:

1. **Expand manga/manhwa coverage** by 300% (ComicK, Manganato, AsuraScans)
2. **Add webcomic support** (Webtoon, Tapas, ComicFury)
3. **Dominate web fiction** (AO3, ScribbleHub, FFNet = 22M+ works)
4. **Cover light novels** (Novel Updates aggregation)
5. **Add non-fiction** (Gutenberg, Google Books)

**Recommended Starting Point:**
Start with **ComicK, AO3, and Gutenberg** this week. These three providers:
- Are relatively easy to implement (1-3 days each)
- Have official or scraper-friendly APIs
- Provide massive content boosts (+80k comics + 10M fiction + 70k non-fiction)
- Have minimal legal risk

This will immediately differentiate Arcanium as a comprehensive reading platform.

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-16  
**Author:** Kiro Analysis System  
**Next Review:** After Phase 1 completion
