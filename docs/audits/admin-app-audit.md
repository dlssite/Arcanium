# Arcanium — Admin Panel Audit (`apps/admin`)

> **Date:** September 2026
> **Auditor:** Senior Full-Stack Engineering Lead
> **Scope:** `apps/admin` — UI, state layer, hooks, types, and its relationship to `services/backend`
> **Reference Documents:** `CONSTITUTION.md`, `docs/sprints/functionality-roadmap.md`

---

## Table of Contents

1. [What the Admin Panel Is](#1-what-the-admin-panel-is)
2. [File Structure Audit](#2-file-structure-audit)
3. [Current State — What Works vs What Is UI Only](#3-current-state--what-works-vs-what-is-ui-only)
4. [Page-by-Page Breakdown](#4-page-by-page-breakdown)
5. [What the Admin Needs to Actually Function](#5-what-the-admin-needs-to-actually-function)
6. [Backend Gap Analysis](#6-backend-gap-analysis)
7. [Constitution Compliance Check](#7-constitution-compliance-check)
8. [Outstanding Issues & Tech Debt](#8-outstanding-issues--tech-debt)
9. [Prioritised Build Plan to Make Admin Functional](#9-prioritised-build-plan-to-make-admin-functional)

---

## 1. What the Admin Panel Is

`apps/admin` is a standalone React + Vite SPA that runs on port 3001. It is the internal operations console for Arcanium — a "Control Plane" used by admins, moderators, and content ops to manage the platform.

Its six pages cover:

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/` | Real-time platform telemetry, activity log, scraper health, top Liber moods |
| Users | `/users` | User management — ban, suspend, role changes, profile inspection |
| Content | `/content` | Catalogue management, scraper parser health, category taxonomy |
| Creators | `/creators` | Creator application review queue, content moderation |
| Liber Analytics | `/ai-liber` | AI token usage, mood analytics, playground prompt tester |
| Feature Flags | `/settings` | Toggle and manage runtime feature flags with rollout percentages |

**Current reality:** Every page renders correctly and is fully interactive — but all data comes from a local Zustand store seeded with static mock data in `apps/admin/src/mocks/mockData.ts`. No API calls are made. No data persists. Refreshing the page resets everything to the mock seed.


---

## 2. File Structure Audit

### 2.1 Actual Directory Layout

```
apps/admin/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx                         # BrowserRouter + all routes
    ├── main.tsx                        # React entry point
    ├── index.css                       # Tailwind base
    ├── vite-env.d.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AdminLayout.tsx         # Sidebar + Outlet shell
    │   │   ├── Header.tsx              # Top bar with theme toggle
    │   │   └── Sidebar.tsx             # Collapsible nav
    │   └── ui/
    │       ├── Badge.tsx
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── Input.tsx
    │       ├── Modal.tsx
    │       ├── Select.tsx
    │       ├── ToggleSwitch.tsx
    │       └── index.ts                # Barrel export
    ├── hooks/
    │   ├── index.ts
    │   ├── useAdminStats.ts
    │   ├── useContentCatalog.ts
    │   ├── useCreatorVerification.ts
    │   ├── useFeatureFlags.ts
    │   ├── useLiberAnalytics.ts
    │   └── useUserManagement.ts
    ├── mocks/
    │   └── mockData.ts                 # All seed data — 400+ lines
    ├── pages/
    │   ├── DashboardPage.tsx
    │   ├── UsersPage.tsx
    │   ├── ContentPage.tsx
    │   ├── CreatorsPage.tsx
    │   ├── LiberAnalyticsPage.tsx
    │   └── FeatureFlagsPage.tsx
    ├── stores/
    │   └── adminStore.ts               # Single Zustand store — all admin state
    └── types/
        └── index.ts                    # All admin TypeScript types
```

### 2.2 What Is Good About This Structure

- Clean separation of layout, UI atoms, hooks, pages, store, types, and mocks.
- Every page has a dedicated hook that encapsulates its store reads and local UI state — pages themselves stay thin.
- The UI component library (`components/ui/`) is self-contained and typed.
- `types/index.ts` is thorough — covers every entity the admin touches.
- Layout uses React Router v6 nested routes correctly (`<Outlet />`).

### 2.3 Structural Issues vs Constitution

The admin is **not mentioned by name in the Constitution** — it is an internal tool, not a user-facing app. However, several Constitution rules still apply.

| Issue | Rule | Severity |
|---|---|---|
| Single god-store `adminStore.ts` handles all 6 domains in one file | §8.3 / §11 | Medium — it is currently under 300 lines per concern but will grow |
| No `@arcanium/api-client` integration — admin makes no API calls | §8.4 | Critical |
| No authentication layer — admin panel has no login, no JWT check | §9.1, §6 (security) | Critical |
| `packages/ui` shared components not used — admin has its own UI atoms | §4.4 | Low (acceptable for now) |
| No TypeScript strict mode verified | §10.1 | Medium |


---

## 3. Current State — What Works vs What Is UI Only

### The Core Problem

`adminStore.ts` is initialised from `mocks/mockData.ts` at module load time. Every action (ban user, approve creator, toggle flag, sync parser) mutates the in-memory Zustand store and adds an entry to the activity log. The UI responds correctly and feels live — but on page refresh everything resets. Nothing is persisted, nothing is fetched from the database.

### Capability Matrix

| Capability | UI Renders | Interaction Works | Persists to DB | Fetches Real Data |
|---|---|---|---|---|
| Platform stats (users, reading hours, AI chats, cost) | ✅ | N/A (display only) | ❌ | ❌ |
| Activity stream with type filter | ✅ | ✅ filter works | ❌ resets on refresh | ❌ mock seed |
| Scraper parser status cards | ✅ | ✅ Sync button triggers mock update | ❌ | ❌ |
| "Sync Parsers" dashboard button | ✅ | ✅ fires `triggerScraperSync` | ❌ | ❌ |
| User table with search/filter | ✅ | ✅ search, role/status filter work | ❌ | ❌ |
| Ban / Suspend user toggle | ✅ | ✅ updates mock store + activity log | ❌ | ❌ |
| Grant Verified Writer | ✅ | ✅ updates mock store | ❌ | ❌ |
| User role change (dropdown) | ✅ | ✅ updates mock store | ❌ | ❌ |
| User detail modal (inspect) | ✅ | ✅ opens modal | ❌ | ❌ |
| Content catalogue table + filters | ✅ | ✅ search, type, category filters work | ❌ | ❌ |
| Category add / remove | ✅ | ✅ updates mock store | ❌ | ❌ |
| Parser sync button per parser | ✅ | ✅ simulates latency improvement | ❌ | ❌ |
| Creator application list + filter | ✅ | ✅ filter by status | ❌ | ❌ |
| Approve / Reject creator application | ✅ | ✅ updates status in mock store | ❌ | ❌ |
| Content moderation queue | ✅ | ✅ approve/quarantine/flag buttons | ❌ | ❌ |
| Liber token usage chart | ✅ | N/A (display only) | ❌ | ❌ |
| Liber mood breakdown bars | ✅ | N/A (display only) | ❌ | ❌ |
| Liber prompt playground | ✅ | ✅ runs mock LLM simulation | ❌ | ❌ mock simulation only |
| Feature flag toggle | ✅ | ✅ toggles in mock store | ❌ | ❌ |
| Feature flag rollout slider | ✅ | ✅ updates rollout % | ❌ | ❌ |
| Add new feature flag modal | ✅ | ✅ adds to mock store | ❌ | ❌ |
| Dark / Light theme toggle | ✅ | ✅ persists to localStorage | ✅ (localStorage only) | N/A |
| Sidebar collapse | ✅ | ✅ works | ❌ (resets on refresh) | N/A |

**Summary:** The admin panel is a pixel-perfect, fully interactive prototype. Zero backend integration.


---

## 4. Page-by-Page Breakdown

### 4.1 Dashboard Page (`/`)

**What it shows:** 4 metric cards (total users, daily reading hours, active Liber sessions, monthly token cost) + activity stream with type filters + creator queue alert + scraper status cards + top moods sidebar.

**State source:** `useAdminStats` → `adminStore.stats`, `adminStore.activities`, `adminStore.parsers`, `adminStore.liberAnalytics`, `adminStore.creators`

**What needs to be real:**
- Stats card values → `GET /api/v1/admin/stats` (does not exist yet)
- Activity stream → `GET /api/v1/admin/activity` (does not exist yet)
- Scraper status → `GET /api/v1/admin/scrapers` (does not exist yet)
- Token cost + mood data → `GET /api/v1/admin/ai/analytics` (does not exist yet)
- "Sync Parsers" button → `POST /api/v1/admin/scrapers/:id/sync` (does not exist yet)

**Current hardcoded values in mock:**
- `totalUsers: 24890`, `dailyReadingHours: 8420`, `activeLiberChats: 1432`, `monthlyTokenCost: 428.60`
- Activity log: 7 hardcoded events
- 4 scraper parsers with static metrics
- 5 mood categories with static percentages and token history

---

### 4.2 Users Page (`/users`)

**What it shows:** Searchable, filterable user table with role and status badges. Selecting a user opens an inspect modal with full stats. Action buttons: Ban, Suspend, Grant Writer, Change Role.

**State source:** `useUserManagement` → `adminStore.users`

**What needs to be real:**
- User list → `GET /api/v1/admin/users?search=&role=&status=&page=&limit=` (does not exist yet)
- Ban user → `PATCH /api/v1/admin/users/:id/status` (does not exist yet)
- Change role → `PATCH /api/v1/admin/users/:id/role` (does not exist yet)
- User detail → `GET /api/v1/admin/users/:id` with full reading stats (does not exist yet)

**Current hardcoded data:** 10 mock users ranging from ADMIN to BANNED, with realistic-looking emails, stats, streak days, and notes.

**Design note:** The `useUserManagement` hook has local `useState` for search and filter — that is correct and should stay. Only the data source needs to change from mock to API.

---

### 4.3 Content Page (`/content`)

**What it shows:** 4 parser status cards with latency/success metrics + sync buttons. Category taxonomy manager (add/remove). Full content catalogue table with search, type filter, category filter.

**State source:** `useContentCatalog` → `adminStore.contentList`, `adminStore.categories`, `adminStore.parsers`

**What needs to be real:**
- Content list → `GET /api/v1/content` (this route **already exists** in the backend — reuse it)
- Parser status → `GET /api/v1/admin/scrapers` (does not exist yet)
- Sync parser → `POST /api/v1/admin/scrapers/:id/sync` (does not exist yet)
- Categories → these map to content genres/tags in the DB. May be a derived list from `GET /api/v1/content/genres` or a separate admin config endpoint.
- Add content via ingest → `POST /api/v1/admin/content/ingest` (does not exist yet — Phase 4)

**Opportunity:** `GET /api/v1/content` already exists in the backend and is consumed by `apps/web`. The admin can reuse `@arcanium/api-client`'s `contentApi.list()` immediately for the catalogue table — this is the easiest win for the whole admin panel.

---

### 4.4 Creators Page (`/creators`)

**What it shows:** Two-tab view — Applications (pending/approved/rejected creator submissions) and Moderation (flagged/quarantined stories with excerpt previews and risk scores).

**State source:** `useCreatorVerification` → `adminStore.creators`, `adminStore.moderatedStories`

**What needs to be real:**
- Creator applications → `GET /api/v1/admin/creators/applications` (does not exist yet)
- Approve → `PATCH /api/v1/admin/creators/applications/:id/approve` (does not exist yet)
- Reject → `PATCH /api/v1/admin/creators/applications/:id/reject` (does not exist yet)
- Moderated stories → `GET /api/v1/admin/moderation/stories` (does not exist yet)
- Update story status → `PATCH /api/v1/admin/moderation/stories/:id/status` (does not exist yet)

**Schema gap:** The Prisma schema has no `CreatorApplication` or `ModeratedStory` model. These must be added before any of the above routes can be built.

---

### 4.5 Liber Analytics Page (`/ai-liber`)

**What it shows:** Token usage stats (today/monthly), cost gauge, avg latency, satisfaction rate. Token usage chart (7-day history bars). Top mood breakdown with percentages. Prompt playground — enter a message, optionally force a tool, see simulated response with tool call details, latency, and token count.

**State source:** `useLiberAnalytics` → `adminStore.liberAnalytics`, `adminStore.playgroundHistory`

**What needs to be real:**
- Analytics stats → `GET /api/v1/admin/ai/analytics` — aggregate over `AiActionLog` + `AiMoodEntry` tables (does not exist yet)
- Token history chart → same endpoint, returns time-series data
- Top moods → aggregate `AiMoodEntry.mood` groupings from DB
- Playground → this should call the **real** `POST /api/v1/ai/chat` endpoint, not simulate it. The `companionApi.chat()` function in `@arcanium/api-client` can be used directly.

**Key observation:** The playground's `executeLiberPromptTest` in `adminStore.ts` is a pure simulation — it uses `setTimeout`, hardcoded responses, and fake tool results. Calling the real backend here would make it a genuine AI debugging tool at zero additional build cost.

---

### 4.6 Feature Flags Page (`/settings`)

**What it shows:** Category-filtered, searchable list of feature flags. Each flag has a toggle, a rollout percentage slider, a description, and metadata (last updated by, timestamp). "Add Flag" modal creates new flags.

**State source:** `useFeatureFlags` → `adminStore.featureFlags`

**What needs to be real:**
- Read flags → currently the flags in `adminStore` are the same logical flags defined as `VITE_FEATURE_FLAG_*` env vars on the frontend. In production, feature flags should be stored in the DB and read at runtime.
- Toggle/update → `PATCH /api/v1/admin/feature-flags/:key` (does not exist yet)
- Create flag → `POST /api/v1/admin/feature-flags` (does not exist yet)

**Architecture decision needed:** The Constitution (§6.2, P2) defines feature flags as environment variables. The admin panel UI treats them as DB-stored, runtime-mutable values (with rollout percentages, categories, audit history). These are two different systems. An ADR is needed to decide: do flags live in DB (more powerful, admin-editable at runtime) or in `.env` files (simpler, requires redeploy to change)? The current admin UI assumes DB. That is the better choice for scale but needs to be ratified.


---

## 5. What the Admin Needs to Actually Function

This section is the complete list of everything required to turn the admin from a UI prototype into a working operations tool. Items are grouped by dependency order.

### 5.1 Authentication & Access Control (Prerequisite for everything)

The admin panel currently has **no login screen, no route guard, and no token check**. Navigating to `localhost:3001` shows the full dashboard immediately to anyone.

Required:
- [ ] Admin login page — email/password only (no Google OAuth for internal tools)
- [ ] `useAdminAuthStore` — in-memory JWT, same pattern as `apps/web`'s `useAuthStore`
- [ ] `<RequireAdminAuth>` route guard wrapping all admin routes
- [ ] Backend: verify the JWT contains `role: 'ADMIN'` or `role: 'MODERATOR'` claim before serving any `/api/v1/admin/*` route
- [ ] `POST /api/v1/auth/admin/login` or reuse `POST /api/v1/auth/login` — check user role after issuing JWT

### 5.2 Admin API Routes (Backend — none currently exist)

All of the following need to be added to `services/backend`. They all require role-based auth middleware checking for `ADMIN` or `MODERATOR`.

#### Stats & Activity
| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/stats` | `{ totalUsers, newUsersToday, dailyReadingHours, activeLiberChats, monthlyTokenCost, costLimit }` |
| `GET` | `/api/v1/admin/activity` | Paginated list of `AiActionLog` + user events + moderation events |

#### User Management
| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/users` | Paginated users with search, role, status filters |
| `GET` | `/api/v1/admin/users/:id` | Full user profile with reading stats |
| `PATCH` | `/api/v1/admin/users/:id/status` | Body: `{ status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }` |
| `PATCH` | `/api/v1/admin/users/:id/role` | Body: `{ role: 'USER' | 'VERIFIED_WRITER' | 'MODERATOR' | 'ADMIN' }` |

#### Content & Scrapers
| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/scrapers` | List of parser configs with live health metrics |
| `POST` | `/api/v1/admin/scrapers/:id/sync` | Triggers a scraper run (Phase 4 — needs Bull queue) |
| `POST` | `/api/v1/admin/content/ingest` | Phase 4 — accepts URL + type, runs scraper pipeline |
| `DELETE` | `/api/v1/admin/content/:id` | Hard-delete a content record |

#### Creators & Moderation
| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/creators/applications` | All `CreatorApplication` records with filter |
| `PATCH` | `/api/v1/admin/creators/applications/:id/approve` | Sets status to APPROVED, upgrades user role |
| `PATCH` | `/api/v1/admin/creators/applications/:id/reject` | Sets status to REJECTED |
| `GET` | `/api/v1/admin/moderation/stories` | Flagged/quarantined content |
| `PATCH` | `/api/v1/admin/moderation/stories/:id/status` | Body: `{ status: 'APPROVED' | 'QUARANTINED' | 'FLAGGED' }` |

#### AI Analytics
| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/ai/analytics` | Aggregate stats over `AiActionLog` + `AiMoodEntry` for dashboard + Liber page |

#### Feature Flags
| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/feature-flags` | All feature flag records |
| `PATCH` | `/api/v1/admin/feature-flags/:key` | Toggle or update rollout % |
| `POST` | `/api/v1/admin/feature-flags` | Create a new flag |

### 5.3 Prisma Schema Additions

The current schema has no models for admin-specific entities. These need to be added:

| Model | Fields | Notes |
|---|---|---|
| `CreatorApplication` | id, userId, penName, portfolioUrl, sampleTitle, sampleSynopsis, pitch, primaryGenre, status (enum), submittedAt, reviewedAt, reviewedBy | New model |
| `ModeratedContent` | id, contentId, authorId, flagReason, riskScore, status (enum), reportedAt, reviewedAt, reviewedBy | New model |
| `FeatureFlag` | key (unique), name, description, category (enum), enabled, rolloutPct, updatedBy, updatedAt | New model — replaces `.env` flags at runtime |
| `ScraperConfig` | id, name, targetDomain, selectorType, enabled, requestDelayMs, lastRunAt, status | New model — stores parser config |
| `User` model additions | `role` (enum: USER, VERIFIED_WRITER, MODERATOR, ADMIN), `status` (enum: ACTIVE, SUSPENDED, BANNED) | Currently `User` has no role or status fields |

> **Important:** The current `User` model in `schema.prisma` has no `role` or `status` fields. The admin types in `apps/admin/src/types/index.ts` define `UserRole` and `UserStatus` but they are not backed by the database yet. This is a blocking schema migration.

### 5.4 `adminStore.ts` Refactor

Once the API routes exist, each domain in `adminStore.ts` should be replaced with TanStack Query:

| Domain | Replace With |
|---|---|
| `stats` / `activities` | `useQuery` → `GET /api/v1/admin/stats` + `/activity` |
| `users` | `useQuery` + `useMutation` → `/admin/users` routes |
| `parsers` | `useQuery` → `/admin/scrapers` |
| `contentList` | `useQuery` → `GET /api/v1/content` (already exists) |
| `creators` + `moderatedStories` | `useQuery` + `useMutation` → `/admin/creators/` routes |
| `liberAnalytics` | `useQuery` → `/admin/ai/analytics` |
| `featureFlags` | `useQuery` + `useMutation` → `/admin/feature-flags` routes |

The `playgroundHistory` (Liber playground) and UI state (`theme`, `sidebarCollapsed`) should remain in Zustand as they are client-only state.

### 5.5 Playground → Real AI Call

`executeLiberPromptTest` should call `companionApi.chat()` directly. Since `@arcanium/api-client` is a workspace package, it can be added to `apps/admin/package.json` as a dependency:

```json
"@arcanium/api-client": "workspace:*"
```

The playground then becomes a genuine Liber debugger that exercises the real agentic loop, shows actual tool calls, and measures real latency — without any additional backend work.


---

## 6. Backend Gap Analysis

Summary of what exists vs what the admin needs from `services/backend`.

### 6.1 Routes That Already Exist (Admin Can Reuse)

| Existing Route | Admin Use Case | Notes |
|---|---|---|
| `GET /api/v1/content` | Content catalogue table | Works today — just needs auth header |
| `GET /api/v1/content/:slug` | Content detail view | Usable |
| `POST /api/v1/auth/login` | Admin login | Works — but needs role check added to response |
| `POST /api/v1/auth/refresh` | Token refresh for admin session | Works |
| `POST /api/v1/auth/logout` | Admin logout | Works |
| `POST /api/v1/ai/chat` | Liber playground real calls | Works — add `@arcanium/api-client` to admin deps |

### 6.2 Routes That Need to Be Built (Admin-Specific)

Total new routes needed: **19 new endpoints** across 5 domains.

| Domain | Count | Blocker |
|---|---|---|
| Stats & Activity | 2 | No `role/status` on User model |
| User Management | 4 | No `role/status` on User model — schema migration needed |
| Content & Scrapers | 4 | Phase 4 scraper queue needed for sync trigger |
| Creators & Moderation | 5 | `CreatorApplication` + `ModeratedContent` models missing from schema |
| AI Analytics | 1 | Aggregation query over existing `AiActionLog` + `AiMoodEntry` — can be built now |
| Feature Flags | 3 | `FeatureFlag` model missing from schema |

### 6.3 Schema Migrations Required Before Admin Can Function

These migrations block the corresponding admin features:

| Migration | Blocks |
|---|---|
| Add `role` + `status` enums + fields to `User` model | User management page, any role-based auth check |
| Add `CreatorApplication` model | Creators page |
| Add `ModeratedContent` model | Creators/moderation page |
| Add `FeatureFlag` model | Feature flags page |
| Add `ScraperConfig` model | Content page parser management (Phase 4) |


---

## 7. Constitution Compliance Check

The admin panel is an internal tool. It is not in the Constitution's monorepo structure definition, which means some rules apply directly and others are by spirit.

| Rule | Section | Status | Finding |
|---|---|---|---|
| No BaaS SDKs | P5 | ✅ | No Supabase, Firebase, or Amplify imports |
| No secrets in source | P6 | ✅ | No hardcoded secrets found in admin source |
| TypeScript mandatory | §10.1 | ✅ | Entire admin is `.tsx/.ts` — no JS files |
| `any` forbidden | §10.1 | ⚠ | Not audited in depth — `adminStore.ts` uses `Record<string, unknown>` in playground which is acceptable |
| Authentication on all data-access operations | P6, §9 | ❌ **Violation** | No auth gate exists. The admin panel is completely open. |
| All authorization enforced server-side | P6 | ❌ **Violation** | No admin-specific backend routes exist — no server-side auth at all |
| No raw fetch in components | §8.4, §11 | ✅ | No fetch calls at all — store is mock-only |
| Feature code isolated before stable | P2 | ✅ | Admin is isolated in `apps/admin/` |
| No god-store >300 lines with >5 responsibilities | §11 | ⚠ Warning | `adminStore.ts` manages 6 domains. Currently ~340 lines but growing. Should be split by domain before API wiring |
| Prisma is sole DB layer | P5 | ✅ By design | No DB access in admin frontend — all would go through backend API |
| 12-Factor config (no hardcoded URLs) | P5, §6 | ⚠ | Admin's `VITE_API_BASE_URL` is not verified to be set in `.env.example` for the admin app |
| Consistent API envelope `{ data, error }` | §5.2 | N/A now | Will apply once API calls are added |
| React Router v6 | §4.2 | ✅ | Correct — nested routes, `<Outlet />` layout |
| Mobile-first | P1 | ⚠ | Admin is an ops console — desktop-first is reasonable. Some pages have `sm:` and `md:` responsive classes but mobile experience is not a priority here |


---

## 8. Outstanding Issues & Tech Debt

### Critical

| # | Issue | Impact | Fix |
|---|---|---|---|
| C1 | **No authentication** — admin panel is completely open to the internet | Anyone who finds the port can see and interact with all admin UI | Add login page + `<RequireAdminAuth>` guard + server-side role check on all `/admin/*` routes |
| C2 | **No backend admin routes** — every action is lost on refresh | The panel cannot function as a real ops tool | Build 19 admin API endpoints across 5 domains |
| C3 | **`User` model missing `role` and `status` fields** — schema does not support the admin's core operations | Cannot ban users, cannot check ADMIN role on API | Run Prisma migration to add `role` enum + `status` enum to `User` model |
| C4 | **`CreatorApplication` and `ModeratedContent` models do not exist in Prisma schema** | Creators page cannot be backed by real data | Add both models and migrate |

### High

| # | Issue | Impact | Fix |
|---|---|---|---|
| H1 | `adminStore.ts` is a god-store managing 6 unrelated domains | Will become unmaintainable when API calls are added | Split into domain-scoped stores: `useUsersStore`, `useContentAdminStore`, `useCreatorsStore`, `useLiberAdminStore`, `useFlagsStore` before API wiring |
| H2 | Liber playground uses a simulation, not the real AI | Devs can't debug actual AI behaviour from the admin | Add `@arcanium/api-client` as a dependency; replace `executeLiberPromptTest` with `companionApi.chat()` |
| H3 | `FeatureFlag` model missing from Prisma schema | Feature flags page cannot persist toggles | Add `FeatureFlag` model, run migration, build CRUD endpoints |
| H4 | No `VITE_API_BASE_URL` or `.env.example` verified for `apps/admin` | Admin may have no environment variable setup | Add `apps/admin/.env.example` with `VITE_API_BASE_URL` |

### Medium

| # | Issue | Impact | Fix |
|---|---|---|---|
| M1 | AI Analytics page shows static token history chart — no real time-series data | Devs cannot monitor actual AI spend | Aggregate `AiActionLog` on the backend; return time-series for chart |
| M2 | Content catalogue table shows only mock 6-book library, not real web novels from the DB | Content ops team sees wrong data | Wire to existing `GET /api/v1/content` — lowest-effort API connection in the whole admin |
| M3 | "Sync Parsers" button does nothing real | Cannot trigger scraper from admin | Needs Phase 4 scraper infrastructure first — acceptable to defer |
| M4 | `ScraperConfig` model not in schema — parser configs are hardcoded in mockData | Cannot persist custom parser configurations | Add model in Phase 4 |
| M5 | No pagination implemented — user table, content table will break at scale | At 24k+ users the table will freeze | Add `page` + `limit` params to all list queries |
| M6 | No TanStack Query in admin — no cache, no background refresh, no loading states | All data will be stale until page refresh | Add `@tanstack/react-query` to admin deps alongside API wiring |

### Low

| # | Issue | Impact | Fix |
|---|---|---|---|
| L1 | `sidebarCollapsed` state resets on refresh | Minor UX annoyance | Persist via Zustand `persist` middleware to `localStorage` |
| L2 | `packages/ui` not used — admin has its own `Badge`, `Button`, `Card`, etc. | Two sets of components to maintain | After `packages/ui` stabilises in web, migrate admin to shared components |
| L3 | No error boundaries on any page | An API error will white-screen the whole panel | Add React error boundaries around each page |
| L4 | Activity stream timestamp is a hardcoded string like "3m ago" rather than a real timestamp | Stale after page reload | Use real `createdAt` timestamps from DB, format with `date-fns` |


---

## 9. Prioritised Build Plan to Make Admin Functional

Ordered strictly by dependency — each sprint unlocks the next.

---

### Sprint A — Foundation (Must ship before anything else) — ~3–4 days

These are blockers for all subsequent work.

**1. Prisma schema migration: add `role` + `status` to `User`**
```prisma
enum UserRole {
  USER
  VERIFIED_WRITER
  MODERATOR
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
}

// On User model, add:
role   UserRole   @default(USER)
status UserStatus @default(ACTIVE)
```
Run `prisma migrate dev --name add-user-role-status`.

**2. Prisma schema migration: add `CreatorApplication`, `ModeratedContent`, `FeatureFlag` models**
All three models are fully defined in `apps/admin/src/types/index.ts` — use those shapes as the blueprint.
Run a single migration covering all three.

**3. Backend: add role-check middleware**
```typescript
// middleware/requireRole.ts
export function requireRole(...roles: UserRole[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }
    next();
  };
}
```
Apply `requireRole('ADMIN', 'MODERATOR')` to all `/api/v1/admin/*` routes.

**4. Add `apps/admin/.env.example`**
```
VITE_API_BASE_URL=http://localhost:4000
```

**5. Add `@arcanium/api-client` and `@tanstack/react-query` to admin `package.json`**
```json
"@arcanium/api-client": "workspace:*",
"@tanstack/react-query": "5.x.x"
```
Wrap `main.tsx` with `<QueryClientProvider>`.

---

### Sprint B — Auth Gate — ~2 days

**6. Admin login page**
- Simple email/password form. Calls `POST /api/v1/auth/login`.
- On success: stores JWT in a new `useAdminAuthStore` (same pattern as web app).
- Route: `/login` (public). All other routes protected by `<RequireAdminAuth>`.

**7. `<RequireAdminAuth>` route guard**
- Checks `useAdminAuthStore.isAuthenticated`.
- Redirects to `/login` if not authenticated.
- On app load: calls `POST /api/v1/auth/refresh` (silent re-auth, same as web app).

---

### Sprint C — Quick Wins (High value, low effort) — ~2–3 days

These use existing backend routes — zero new API work needed.

**8. Wire Content catalogue table to real data**
- Replace `adminStore.contentList` with `useQuery → contentApi.list()`.
- Immediately shows real DB content with search + filters.
- Estimated effort: ~1 hour.

**9. Wire Liber playground to real AI**
- Add `companionApi.chat()` call inside `executeLiberPromptTest`.
- Display real `toolCallsMade`, real latency, real token count (if returned by API).
- Estimated effort: ~2 hours.

---

### Sprint D — User Management — ~3 days

**10. Build user management API routes** (4 endpoints)
**11. Replace `adminStore.users` with TanStack Query** — `useQuery` + `useMutation` with optimistic updates.
**12. Wire ban/suspend/role change to real mutations** — on success, invalidate user list query.

---

### Sprint E — Feature Flags — ~2 days

**13. Build feature flag API routes** (3 endpoints)
**14. Replace `adminStore.featureFlags` with TanStack Query**
**15. Consider ADR**: DB-stored flags vs env-var flags — document the decision.

---

### Sprint F — Creators & Moderation — ~3 days

**16. Build creator application API routes** (5 endpoints)
**17. Wire `CreatorsPage` to real data** — applications + moderation queue.

---

### Sprint G — Dashboard Stats & AI Analytics — ~3 days

**18. Build `GET /api/v1/admin/stats`** — aggregate query across `User`, `ReadingProgress`, `AiActionLog`
**19. Build `GET /api/v1/admin/ai/analytics`** — aggregate `AiActionLog` + `AiMoodEntry` for token history + mood breakdown
**20. Wire `DashboardPage` and `LiberAnalyticsPage`** to real queries

---

### Sprint H — Scrapers & Content Ingest (Phase 4 dependency) — ~5 days

**21. Build `ScraperConfig` model and migration**
**22. Build scraper infrastructure** (Bull queue, parser modules) — aligns with web Phase 4
**23. Build `GET /api/v1/admin/scrapers` and `POST /api/v1/admin/scrapers/:id/sync`**
**24. Wire `ContentPage` scraper cards to real data**

---

### Complete Admin Functionality Checklist

- [ ] Sprint A: Schema migrations + role middleware + env setup + deps
- [ ] Sprint B: Admin login + auth gate
- [ ] Sprint C: Content table wired + playground using real AI
- [ ] Sprint D: User management fully live
- [ ] Sprint E: Feature flags persisted in DB
- [ ] Sprint F: Creator applications + moderation live
- [ ] Sprint G: Dashboard and Liber analytics showing real metrics
- [ ] Sprint H: Scrapers wired (Phase 4 dependency)

---

*Audit completed: September 2026 — Arcanium Engineering Lead*
*The admin panel is fully-featured as a prototype and requires ~6 sprints of backend + integration work to become a production operations tool.*
*Start with Sprint A — nothing else is possible without the schema migrations and auth gate.*
