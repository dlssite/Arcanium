# Arcanium Phase 4 Spec: Reader Engine + Dual Content Pipeline

> Status: Active | Date: September 2026

## Overview

Phase 4 delivers two things:
1. **The Reader** - full-screen offline-capable reading at /read/:slug/:chapter
2. **Dual Content Pipeline** - two ways content enters the platform

Pipeline A: Scraper - admin/ops ingests external URLs (Royal Road, MangaDex, etc.)
Pipeline B: Creator Upload - verified writers publish original chapters directly

Both pipelines write to the same Content + Chapter tables. The reader doesn't care which pipeline produced the content.

## Architecture

Content enters via one of two pipelines:

  SCRAPER PIPELINE               CREATOR UPLOAD PIPELINE
  Admin submits URL              Verified writer logs in
  Cheerio/REST/Readability       Creates Content record
  Parses + stores Chapter        Writes Chapter.bodyText
  source = SCRAPED               source = CREATOR_UPLOAD
         |                              |
         +----------+  +-----------+----+
                    |  |
              Content + Chapter DB
                    |
              Reader UI (/read/:slug/:ch)
              Offline IndexedDB cache
              Progress sync

## Key Design Decisions

- Chapter.bodyText is nullable. Scraped chapters fetch body on first reader request.
  Creator chapters always have bodyText populated before publish.
- Content.source enum: SCRAPED | CREATOR_UPLOAD | ADMIN_UPLOAD
- Content.creatorId links creator content to a User (null for scraped)
- User.role enum added: USER | VERIFIED_WRITER | MODERATOR | ADMIN
- Creator workflow: DRAFT -> PUBLISHED (readers only see PUBLISHED)
- Scraped content goes straight to PUBLISHED
- Chapter.isPublished flag controls visibility per-chapter for creators

## Sprint A - Schema Changes

### New Prisma fields and models

#### 1. Chapter model additions
`prisma
model Chapter {
  // existing fields...
  bodyText    String?   // nullable - scraped chapters populated on demand
  wordCount   Int       @default(0)
  isPublished Boolean   @default(true)  // creators use false for drafts
  isDraft     Boolean   @default(false)
}
`

#### 2. Content model additions
`prisma
enum ContentSource {
  SCRAPED
  CREATOR_UPLOAD
  ADMIN_UPLOAD
}

model Content {
  // existing fields...
  source      ContentSource @default(SCRAPED)
  creatorId   String?       // null for scraped content
  creator     User?         @relation('CreatedContent', fields: [creatorId], references: [id])
}
`

#### 3. User model additions
`prisma
enum UserRole {
  USER
  VERIFIED_WRITER
  MODERATOR
  ADMIN
}

model User {
  // existing fields...
  role            UserRole  @default(USER)
  createdContent  Content[] @relation('CreatedContent')
}
`

### Migration command
pnpm --filter @arcanium/backend db:migrate --name add_phase4_fields

## Sprint B - Scraper Pipeline

### Directory structure
`
services/backend/src/scraper/
  index.ts              - exports ScraperService
  scraperRouter.ts      - POST /api/v1/admin/content/ingest
  parsers/
    royalroad.parser.ts - Cheerio HTML parser for royalroad.com
    mangadex.parser.ts  - MangaDex REST API v5 consumer
    generic.parser.ts   - @mozilla/readability fallback for any URL
    index.ts            - dispatches to correct parser by hostname
  scraperQueue.ts       - Bull/BullMQ job queue for background chapter sync
`

### New npm packages needed
- cheerio (HTML parsing for Royal Road and similar sites)
- @mozilla/readability (generic article extraction)
- node-html-parser (lightweight alternative where cheerio is overkill)
- bullmq (job queue for background scraping)
- ioredis (required by BullMQ - Redis connection)
- node-fetch or undici (HTTP requests in scraper)
- slugify (generate slug from title)

### POST /api/v1/admin/content/ingest
Request:
  { url: string, type: ContentType, overrideTitle?: string }

Response:
  { data: { contentId, slug, title, chaptersQueued }, error: null }

Flow:
  1. Admin submits URL
  2. Detect source site from hostname
  3. Dispatch to correct parser
  4. Create/upsert Content record
  5. Queue background jobs to fetch all chapters
  6. Return immediately with content metadata
  7. Background: each job fetches one chapter bodyText + stores it

### Parser contracts
Each parser implements:
  interface Parser {
    canHandle(url: string): boolean
    extractMetadata(url: string): Promise<ContentMetadata>
    extractChapterList(url: string): Promise<ChapterRef[]>
    extractChapterBody(chapterUrl: string): Promise<string>
  }

## Sprint C - Creator Upload Pipeline

### New API routes
All routes require authentication + VERIFIED_WRITER or ADMIN role.

POST   /api/v1/creator/content
  Create a new Content record (source=CREATOR_UPLOAD, creatorId=req.user.id)

GET    /api/v1/creator/content
  List the authenticated creator's own content

PATCH  /api/v1/creator/content/:contentId
  Update metadata (title, synopsis, cover, status)

POST   /api/v1/creator/content/:contentId/chapters
  Create a new chapter (isDraft=true by default)
  Body: { number, title, bodyText, wordCount }

PATCH  /api/v1/creator/content/:contentId/chapters/:chapterId
  Update chapter body text or title

POST   /api/v1/creator/content/:contentId/chapters/:chapterId/publish
  Set isPublished=true, isDraft=false, publishedAt=now()

DELETE /api/v1/creator/content/:contentId/chapters/:chapterId
  Hard delete (only drafts can be deleted)

### Middleware
requireVerifiedWriter middleware - checks req.user.role in [VERIFIED_WRITER, ADMIN]


## Sprint D - Chapter Content API

### New endpoint
GET /api/v1/content/:slug/chapters/:number

Returns full chapter including bodyText.
Requires authentication (reading is a logged-in feature).

Response:
`json
{
  "data": {
    "id": "...",
    "number": 1,
    "title": "Chapter 1: The Archive Opens",
    "bodyText": "<p>Full HTML content...</p>",
    "wordCount": 3200,
    "publishedAt": "2026-09-01T00:00:00Z",
    "content": {
      "id": "...",
      "slug": "shadow-slave",
      "title": "Shadow Slave",
      "type": "WEB_NOVEL",
      "chapterCount": 1982
    },
    "prevChapter": 0.5,
    "nextChapter": 2
  }
}
`

If bodyText is null (scraped but not yet fetched):
- Trigger a background scrape job for this specific chapter
- Return 202 Accepted with { status: 'fetching', retryAfter: 5 }
- Frontend polls every 5 seconds until bodyText is available

### Reading progress auto-save
PATCH /api/v1/library/progress/:contentId
  Already exists. Reader calls this on chapter completion + every 30s scroll position.

## Sprint E - Reader Frontend

### Feature directory
`
apps/web/src/features/reader/
  components/
    ReaderView.tsx        - Full-screen layout, orchestrates everything
    ReaderToolbar.tsx     - Top bar: back, chapter nav, font, theme, TTS
    ChapterContent.tsx    - Renders novel text OR manga image pages
    ChapterFetching.tsx   - Shown while bodyText is being fetched (202 state)
  hooks/
    useReader.ts          - Orchestrates chapter fetch, progress, offline cache
    useReaderSettings.ts  - Font size, theme (light/dark/sepia), persisted
  queryKeys.ts
`

### Route
/read/:slug/:chapter (e.g. /read/shadow-slave/1)
Added to AppRouter.tsx as a lazy-loaded code-split route.

### useReader.ts core logic
`	ypescript
async function getChapter(slug: string, number: number) {
  // 1. Check IndexedDB first
  const cached = await idb.get('chapters', slug + ':' + number)
  if (cached) return cached

  // 2. Fetch from API
  const chapter = await contentApi.getChapter(slug, number)

  // 3. Store in IndexedDB for offline
  await idb.put('chapters', chapter, slug + ':' + number)

  // 4. Pre-fetch next 2 chapters in background
  prefetchAhead(slug, number + 1, number + 2)

  return chapter
}
`

### ReaderSettings (useReaderStore expansion)
`	ypescript
// Added to useReaderStore.ts:
fontScale: number        // 0.8 - 1.4, default 1.0
readerTheme: 'light' | 'dark' | 'sepia'  // independent of app theme
lineHeight: number       // 1.4 - 2.0, default 1.7
fontFamily: 'serif' | 'sans'
`
All persisted via Zustand persist middleware to localStorage.

### ChapterContent rendering modes
- WEB_NOVEL / LIGHT_NOVEL / EBOOK: renders bodyText as HTML prose
- MANGA / COMIC / WEBTOON: renders image URLs as vertical scroll stack
  (Chapter.bodyText contains JSON array of image URLs for image types)

## Sprint F - Offline-First Layer

### Service Worker (Workbox)
File: apps/web/public/sw.js
Registered in: apps/web/src/main.tsx

Caching strategies:
- Static assets (JS, CSS, images): CacheFirst, max 30 days
- API responses for content list: StaleWhileRevalidate, max 5 min
- Chapter content: CacheFirst once cached (chapters don't change)

### IndexedDB schema
Database: 'arcanium-reader', version 1

Object stores:
- 'chapters'     - keyPath: '{slug}:{number}', stores full chapter response
- 'progress'     - keyPath: '{userId}:{contentId}', stores scroll position
- 'content-meta' - keyPath: 'slug', stores Content metadata for offline library

### Offline indicator
Component: src/components/shared/OfflineBanner.tsx
Shown when navigator.onLine === false
Message: "You're reading offline. Changes will sync when you reconnect."
Wired into App.jsx via window online/offline events.

## Sprint G - packages needed (install before Sprint B)
`
pnpm --filter @arcanium/backend add cheerio @mozilla/readability bullmq ioredis slugify
pnpm --filter @arcanium/backend add -D @types/cheerio
pnpm --filter web add workbox-window
pnpm --filter web add -D workbox-webpack-plugin
`
Note: BullMQ requires a Redis instance. For Phase 4 dev: use Upstash Redis (free tier).
For Phase 2 deployment (Docker): Redis container in docker-compose.yml.
If Redis is not available, scraper runs synchronously (no background jobs) - graceful fallback.

## 8. Acceptance Criteria

- [ ] POST /api/v1/admin/content/ingest with Royal Road URL creates Content + Chapter records
- [ ] Chapter.bodyText populated after background job completes
- [ ] POST /api/v1/creator/content creates content with source=CREATOR_UPLOAD
- [ ] Creator can publish a chapter (isDraft=false, isPublished=true)
- [ ] GET /api/v1/content/:slug/chapters/:number returns bodyText
- [ ] /read/:slug/1 renders Chapter 1 text in the reader
- [ ] Font size + reader theme persisted across browser refreshes
- [ ] Manga chapters render as vertical image stack
- [ ] Turning off network after loading Ch1 - Ch2 still opens (IndexedDB cached)
- [ ] Reading progress scroll % survives browser refresh
- [ ] Offline banner appears when navigator.onLine = false
- [ ] Lighthouse Performance >= 90 on reader route

---
*Phase 4 Spec - September 2026 - Arcanium Engineering Lead*
