# Testing New Providers - Phase 1

## Overview
This document provides instructions for testing the 7 new content providers added to Arcanium.

## New Providers Added

| Provider | Domain | Type | Coverage | Method |
|----------|--------|------|----------|--------|
| ComicK | comick.io | Manga/Manhwa/Webtoon | 100k+ | REST API |
| AsuraScans | asuracomic.net | Manhwa | Popular | HTML |
| AO3 | archiveofourown.org | Fan Fiction | 10M+ | HTML |
| Webtoon | webtoons.com | Official Webtoons | 1k+ | HTML |
| NovelUpdates | novelupdates.com | Light Novels | 40k+ | HTML |
| Gutenberg | gutenberg.org | Classics | 70k+ | HTML |
| Tapas | tapas.io | Western Comics | 8k+ | HTML |

---

## Quick Test (Recommended)

### 1. Seed the database
```bash
cd services/backend
pnpm exec -- node seed-new-providers.mjs
```

### 2. Build the backend
```bash
pnpm run build
```

### 3. Run the test script
```bash
node test-providers.mjs
```

This will test all 7 providers automatically and show results.

---

## Manual Testing

### Setup
1. **Start the backend server:**
   ```bash
   cd services/backend
   pnpm dev
   ```

2. **Use the ingestion API endpoint:**
   ```
   POST http://localhost:3000/api/ingest
   Content-Type: application/json
   
   { "url": "https://..." }
   ```

### Test Cases

#### 1. ComicK Provider (Manga/Manhwa)
```bash
# Test Solo Leveling (Manhwa)
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://comick.io/comic/solo-leveling"}'

# Test One Piece (Manga)
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://comick.io/comic/one-piece"}'
```

**Expected:**
- ✅ Title: "Solo Leveling" / "One Piece"
- ✅ Type: WEBTOON / MANGA
- ✅ Chapters: 100+ / 1000+
- ✅ Images: JSON array of CDN URLs

#### 2. AsuraScans Provider (Manhwa Scanlations)
```bash
# Test The Beginning After The End
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://asuracomic.net/series/the-beginning-after-the-end"}'
```

**Expected:**
- ✅ Title extracted
- ✅ Type: WEBTOON or MANGA
- ✅ Chapters with numbers and titles
- ✅ Chapter images extracted

#### 3. AO3 Provider (Fan Fiction)
```bash
# Test a multi-chapter work
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://archiveofourown.org/works/11478249"}'
```

**Expected:**
- ✅ Title and author extracted
- ✅ Type: WEB_NOVEL
- ✅ Multiple chapters (if multi-chapter work)
- ✅ HTML text content sanitized
- ✅ Tags and genres populated

#### 4. Webtoon Provider (Official Webtoons)
```bash
# Test Tower of God
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.webtoons.com/en/fantasy/tower-of-god/list?title_no=95"}'
```

**Expected:**
- ✅ Title: "Tower of God"
- ✅ Type: WEBTOON
- ✅ 500+ episodes
- ✅ Episode images extracted

#### 5. NovelUpdates Provider (Light Novel Tracker)
```bash
# Test Solo Leveling (novel)
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.novelupdates.com/series/solo-leveling"}'
```

**Expected:**
- ✅ Title and metadata
- ✅ Type: LIGHT_NOVEL
- ✅ Chapter list with external links
- ✅ Note: Chapters link to translator sites (aggregator)

#### 6. Gutenberg Provider (Public Domain Classics)
```bash
# Test Pride and Prejudice
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.gutenberg.org/ebooks/1342"}'

# Test Alice in Wonderland
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.gutenberg.org/ebooks/11"}'
```

**Expected:**
- ✅ Title: "Pride and Prejudice" / "Alice's Adventures in Wonderland"
- ✅ Author: Jane Austen / Lewis Carroll
- ✅ Type: EBOOK
- ✅ Status: COMPLETED
- ✅ Full text chapter

#### 7. Tapas Provider (Western Comics & Novels)
```bash
# Test The Beginning After The End (comic)
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tapas.io/series/tbate-comic"}'

# Test unORDINARY
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tapas.io/series/unordinary"}'
```

**Expected:**
- ✅ Title and metadata
- ✅ Type: COMIC or WEBTOON
- ✅ Episodes listed
- ✅ Images or text extracted

---

## What to Check

### ✅ Metadata Extraction
- [ ] Title is correct
- [ ] Author/Artist extracted (if available)
- [ ] Synopsis/description populated
- [ ] Cover image URL valid
- [ ] Genres/tags extracted
- [ ] Status detected (ONGOING/COMPLETED/HIATUS)
- [ ] Content type correct (MANGA/MANHWA/WEBTOON/WEB_NOVEL/EBOOK/COMIC)

### ✅ Chapter List
- [ ] Chapter count reasonable
- [ ] Chapter numbers sequential
- [ ] Chapter titles extracted
- [ ] Chapter URLs valid
- [ ] Published dates (if available)

### ✅ Chapter Content
- [ ] **For Image Content** (Manga/Comics):
  - [ ] Returns JSON array of image URLs
  - [ ] Image URLs are valid HTTPS
  - [ ] Images are accessible
  - [ ] Correct CDN domain
- [ ] **For Text Content** (Novels):
  - [ ] Returns sanitized HTML
  - [ ] No scripts or dangerous content
  - [ ] Formatting preserved
  - [ ] Reasonable content length

---

## Troubleshooting

### Provider Not Matching
**Problem:** Wrong provider being used for URL
**Solution:** Check provider order in `scraper/parsers/index.ts`. More specific providers should be first.

### No Metadata Extracted
**Problem:** Selectors not matching
**Solution:** 
1. Check if site structure changed
2. Inspect HTML manually
3. Update selectors in provider file

### Chapter List Empty
**Problem:** Chapter links not found
**Solution:**
1. Check if site uses JavaScript to load chapters
2. May need Playwright for dynamic content
3. Verify URL pattern is correct

### Images Not Loading
**Problem:** Image URLs broken or 403 errors
**Solution:**
1. Check if CDN requires specific headers (Referer, User-Agent)
2. Verify image URL format
3. Check for anti-scraping measures

### Rate Limiting
**Problem:** Getting 429 or blocked
**Solution:**
1. Increase `requestDelayMs` in seed config
2. Add exponential backoff
3. Consider respecting robots.txt more strictly

---

## Performance Benchmarks

Expected performance (rough estimates):

| Provider | Metadata | Chapter List | Chapter Body |
|----------|----------|--------------|--------------|
| ComicK | <1s | <2s | <1s |
| AsuraScans | <2s | <3s | <2s |
| AO3 | <2s | <3s | <1s |
| Webtoon | <2s | <3s | <2s |
| NovelUpdates | <2s | <2s | N/A (links) |
| Gutenberg | <2s | <1s | <3s |
| Tapas | <2s | <3s | <2s |

---

## Next Steps

After testing all providers:

1. ✅ Mark tested providers as verified
2. 📝 Document any issues or limitations
3. 🔧 Adjust rate limits if needed
4. 📊 Monitor error rates in production
5. 🚀 Deploy to staging environment
6. 🎯 Add more test cases for edge cases
7. 📈 Set up monitoring/alerts

---

## Test URLs Reference

See `test-provider-urls.json` for complete list of test URLs for each provider.

---

## Support

If you encounter issues:
1. Check provider implementation in `services/backend/src/providers/`
2. Review HTML structure on source site
3. Check for recent site updates
4. Update selectors if needed
5. Add fallback selectors for robustness
