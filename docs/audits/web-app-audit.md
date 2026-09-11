# Arcanium — Web App Audit (`apps/web`) — FINAL

> **Original Date:** September 2026
> **Last Updated:** September 2026 — Phase 4 complete
> **Status:** Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅

---

## All Phases Complete

### Phase 1 — Local State & Hook Layer ✅
Zero hardcoded data in components. Unified Liber chat state. Centralised mock data.
All Zustand stores built and feature-scoped.

### Phase 2 — Backend API & Prisma ✅
All views on real API data. Auth live (Google OAuth + email/password).
React Router v6 lazy routes. Community API live. ProfileView badges from DB.
Feature flags enforced in components.

### Phase 3 — Agentic AI (Liber) ✅
Full tool loop (9 tools). Voice I/O (useSpeechInput + useSpeechOutput).
All tools: search_content, add_to_shelf, update_reading_mood, get_reading_progress,
update_reading_progress, get_recommendations, fetch_book_details,
get_chapter_passage, set_reading_goal.

### Phase 4 — Reader Engine + Dual Content Pipeline ✅
Two content pipelines, reader engine, offline-first layer.

---

## Phase 4 — What Was Built

### Schema additions (Sprint A)
- UserRole enum: USER | VERIFIED_WRITER | MODERATOR | ADMIN
- ContentSource enum: SCRAPED | CREATOR_UPLOAD | ADMIN_UPLOAD
- User.role field (default USER)
- Content.source + Content.creatorId (optional FK to User)
- Chapter.bodyText (nullable Text), wordCount, isPublished, isDraft, sourceUrl (now optional)
- Prisma migration applied: phase4_content_pipeline

### Pipeline A — Scraper (Sprint B)
- services/backend/src/scraper/parsers/royalroad.parser.ts (Cheerio HTML)
- services/backend/src/scraper/parsers/mangadex.parser.ts (REST API v5)
- services/backend/src/scraper/parsers/generic.parser.ts (@mozilla/readability)
- services/backend/src/scraper/parsers/index.ts (registry, auto-dispatch by hostname)
- services/backend/src/scraper/scraperQueue.ts (BullMQ + Redis, graceful fallback)
- services/backend/src/scraper/scraper.service.ts (ingestContent flow)
- POST /api/v1/admin/content/ingest (admin/moderator only)
- requireRole.ts middleware
- JWT now embeds user role for auth-free role checks

### Pipeline B — Creator Upload (Sprint C)
- services/backend/src/services/creator.service.ts
  - createContent, listCreatorContent, updateContent
  - createChapter, updateChapter, publishChapter, deleteChapter, listCreatorChapters
  - Ownership assertion on every mutation (creators own their content; admins can edit all)
  - Draft/publish flow: isDraft=true by default, publishChapter sets isPublished=true
- POST /api/v1/creator, GET /api/v1/creator, PATCH /api/v1/creator/:contentId
- POST/GET/PATCH/DELETE /api/v1/creator/:contentId/chapters/:chapterId
- POST /api/v1/creator/:contentId/chapters/:chapterId/publish
- Requires VERIFIED_WRITER or ADMIN role

### Chapter Content API (Sprint D)
- GET /api/v1/content/:slug/chapters/:number (auth required)
- Returns full bodyText, wordCount, prevChapter, nextChapter, content summary
- If bodyText is null: returns 202 + triggers on-demand background fetch
- Reader polls every 5s until body is ready

### Reader Frontend (Sprint E)
- apps/web/src/features/reader/ (new feature directory)
  - useReaderSettings.ts — fontScale, readerTheme (light/dark/sepia), lineHeight, fontFamily
    persisted via Zustand persist middleware to localStorage
  - useReader.ts — offline-first IndexedDB cache, TanStack Query, progress sync,
    202 polling for in-progress scrapes, background pre-fetch next 2 chapters
  - components/ReaderView.tsx — full-screen layout, handles all loading/error/fetching states
  - components/ReaderToolbar.tsx — back nav, chapter nav, settings panel
  - components/ChapterContent.tsx — prose renderer (HTML) + manga image stack
- Route: /read/:slug/:chapter (lazy-loaded, outside AppShell, no nav chrome)
- BookDetailModal "Begin Reading" now navigates to /read/:slug/1
- VITE_FEATURE_FLAG_READER now defaults to "true" in .env.example

### Offline-First Layer (Sprint F)
- apps/web/public/sw.js — custom Service Worker
  - CacheFirst for static assets + chapter content
  - StaleWhileRevalidate for content catalogue API
  - NetworkFirst for auth/library/AI endpoints
  - Registered in main.tsx (production only)
- IndexedDB used in useReader.ts — raw IDB API, no external dependency
  - 'chapters' store: keyed by slug:number, stores full ChapterDetail
  - 'progress' store: keyed by contentId:scroll, stores scroll position
- apps/web/src/components/shared/OfflineBanner.tsx
  - Shown when navigator.onLine === false
  - Wired via window online/offline events
  - Visible above bottom nav on mobile

### packages/api-client additions
- contentApi.getChapter(slug, number) → GET /api/v1/content/:slug/chapters/:number
- creatorApi (createContent, listContent, updateContent, listChapters, createChapter,
  updateChapter, publishChapter, deleteChapter)
- adminApi.ingest() → POST /api/v1/admin/content/ingest

---

## Remaining (Post-Phase 4 — Future Sprints)

### Admin Panel (Sprints A–H in admin-app-audit.md)
The admin panel is still a UI prototype. Admin Sprint A (schema migrations + auth gate)
should be the next sprint after Phase 4.

### packages/ui shared component library
Empty. Populate after patterns stabilise post-Phase 4.

### Full TypeScript annotation pass
All .tsx view files have @ts-nocheck with tracked justification.
Remove @ts-nocheck and add proper prop interfaces in a dedicated TS sprint.

### Lighthouse performance audit
Run after admin Sprint A deployment. Target: >= 90 on reader route.

### Content seeding
Run `pnpm --filter @arcanium/backend db:seed` to populate demo catalogue.
Then test the reader end-to-end with a real Royal Road URL via the ingest endpoint.

---

*Final update: September 2026 — All four phases of apps/web complete.*
*Next: Admin panel Sprint A (see docs/audits/admin-app-audit.md)*
