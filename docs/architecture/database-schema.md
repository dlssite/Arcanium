# Arcanium — Database Schema

> **Stack:** PostgreSQL · Prisma ORM · Node.js backend
> **Schema file:** `services/backend/prisma/schema.prisma`
> **Rule:** Prisma is the sole data-access layer. All schema changes go through `prisma migrate dev`. Direct DB edits are forbidden (see CONSTITUTION §5.3).

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Entity Relationship Overview](#2-entity-relationship-overview)
3. [Full schema.prisma](#3-full-schemaprisma)
4. [Model Reference](#4-model-reference)
   - [User](#41-user)
   - [Content](#42-content)
   - [Chapter](#43-chapter)
   - [Shelf](#44-shelf)
   - [ShelfEntry](#45-shelfentry)
   - [ReadingProgress](#46-readingprogress)
   - [AiMemory](#47-aimemory)
   - [AiMoodEntry](#48-aimoodentry)
   - [AiActionLog](#49-aiactionlog)
5. [Key Relationships Explained](#5-key-relationships-explained)
6. [Design Decisions and Trade-offs](#6-design-decisions-and-trade-offs)

---

## 1. Design Philosophy

Three constraints drove every decision here:

- **Flexibility over rigidity.** We serve web novels, comics, light novels, and ebooks from external sources. The `Content` model must not be a rigid table with 20 nullable columns for each format. Instead it uses a JSON `metadata` field for format-specific data alongside a fixed set of universal fields.
- **Ownership is always the user.** Library entries, shelves, progress, and AI memory are all scoped to a `userId`. No data is shared between users at the schema level (the Community layer, when built, gets its own models).
- **The AI is a first-class citizen.** Memory, mood history, and action logs are proper relational tables — not JSON blobs jammed into the User row — so they can be queried, paginated, and pruned efficiently.

---

## 2. Entity Relationship Overview

```
User
 ├── Shelf (1:many)  ← named collections ("Weekend Binge", "Classics")
 │    └── ShelfEntry (1:many) ── Content
 ├── ReadingProgress (1:many) ── Content
 ├── AiMemory (1:1)            ← persistent preferences & context summary
 ├── AiMoodEntry (1:many)      ← timestamped mood/session snapshots
 └── AiActionLog (1:many)      ← audit trail of every AI tool call

Content
 └── Chapter (1:many)          ← individual chapters / issues / pages
```

`Content` is the central catalogue. It is **not user-owned** — it is a shared record representing a title. Users relate to `Content` through `ShelfEntry` and `ReadingProgress`, which carry all the user-specific state.

---
## 3. Full schema.prisma

```prisma
// services/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------

enum ContentType {
  WEB_NOVEL
  LIGHT_NOVEL
  COMIC
  MANGA
  EBOOK
  WEBTOON
}

enum ContentStatus {
  ONGOING
  COMPLETED
  HIATUS
  CANCELLED
  UNKNOWN
}

enum ReadingStatus {
  READING
  COMPLETED
  ON_HOLD
  DROPPED
  PLAN_TO_READ
}

// ---------------------------------------------------------------------------
// USER
// ---------------------------------------------------------------------------

model User {
  id            String   @id @default(cuid())
  googleId      String   @unique
  email         String   @unique
  displayName   String
  avatarUrl     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  shelves         Shelf[]
  readingProgress ReadingProgress[]
  aiMemory        AiMemory?
  aiMoodEntries   AiMoodEntry[]
  aiActionLogs    AiActionLog[]

  @@index([email])
  @@index([googleId])
}

// ---------------------------------------------------------------------------
// CONTENT CATALOGUE
// ---------------------------------------------------------------------------

model Content {
  id            String        @id @default(cuid())
  type          ContentType
  status        ContentStatus @default(UNKNOWN)

  // Universal fields
  title         String
  slug          String        @unique  // URL-safe identifier, e.g. "solo-leveling"
  author        String?
  artist        String?
  synopsis      String?
  coverImageUrl String?
  language      String        @default("en")

  // Source tracking (for scraped / external content)
  sourceUrl     String?       // canonical URL of the external source
  sourceSite    String?       // e.g. "royalroad", "mangadex", "webtoons"

  // Format-specific extras (genre tags, chapter count, volume count, etc.)
  // Stored as JSON to keep the table schema stable across content types.
  // Validated at the application layer via Zod before write.
  metadata      Json          @default("{}")

  // Aggregate cache — updated by background jobs, not computed at query time
  chapterCount  Int           @default(0)
  rating        Float?        // community average, nullable until rated

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  chapters        Chapter[]
  shelfEntries    ShelfEntry[]
  readingProgress ReadingProgress[]

  @@index([type])
  @@index([sourceSite, sourceUrl])
  @@index([slug])
}

// ---------------------------------------------------------------------------
// CHAPTER
// ---------------------------------------------------------------------------

model Chapter {
  id          String   @id @default(cuid())
  contentId   String
  content     Content  @relation(fields: [contentId], references: [id], onDelete: Cascade)

  number      Float    // Float to support chapter 12.5 / side stories
  title       String?
  sourceUrl   String   // URL of the actual readable page / CDN resource
  publishedAt DateTime?
  createdAt   DateTime @default(now())

  @@unique([contentId, number])
  @@index([contentId])
}

// ---------------------------------------------------------------------------
// LIBRARY — SHELVES
// ---------------------------------------------------------------------------

model Shelf {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String              // e.g. "Weekend Binge", "Completed", "Dropped"
  description String?
  isDefault   Boolean  @default(false)  // system-created shelf (Reading, Completed, etc.)
  isPublic    Boolean  @default(false)  // for future community sharing
  sortOrder   Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  entries     ShelfEntry[]

  @@unique([userId, name])
  @@index([userId])
}

model ShelfEntry {
  id          String   @id @default(cuid())
  shelfId     String
  shelf       Shelf    @relation(fields: [shelfId], references: [id], onDelete: Cascade)
  contentId   String
  content     Content  @relation(fields: [contentId], references: [id], onDelete: Cascade)

  addedAt     DateTime @default(now())
  sortOrder   Int      @default(0)
  note        String?  // user's personal note on this entry

  @@unique([shelfId, contentId])
  @@index([shelfId])
  @@index([contentId])
}

// ---------------------------------------------------------------------------
// READING PROGRESS
// ---------------------------------------------------------------------------

model ReadingProgress {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  contentId       String
  content         Content       @relation(fields: [contentId], references: [id], onDelete: Cascade)

  status          ReadingStatus @default(PLAN_TO_READ)
  lastChapterRead Float?        // matches Chapter.number
  lastReadAt      DateTime?
  startedAt       DateTime?
  completedAt     DateTime?

  // For ebooks / PDFs: track scroll position (0.0–1.0)
  scrollPosition  Float?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([userId, contentId])
  @@index([userId, status])
  @@index([contentId])
}

// ---------------------------------------------------------------------------
// AI MEMORY
// ---------------------------------------------------------------------------

// One row per user. Holds the durable, long-term context the AI Housekeeper
// needs to personalise recommendations without replaying the full chat history.
model AiMemory {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Distilled preference summary — rewritten by the AI after significant sessions.
  // Plain text, max ~2000 tokens. The backend trims this via a summarisation step.
  preferenceSummary String?

  // Structured preferences — written by tool calls, read back into system prompt context.
  // Schema: { genres: string[], avoidTags: string[], pacePreference: "fast"|"slow"|"any",
  //           preferredTypes: ContentType[], preferredLanguages: string[] }
  preferences       Json    @default("{}")

  // Last active reading context — used to resume conversation naturally.
  // Schema: { lastContentId: string|null, lastContentTitle: string|null,
  //           lastChapterNumber: number|null, sessionSummary: string|null }
  lastContext       Json    @default("{}")

  updatedAt DateTime @updatedAt
}

// Append-only log of mood snapshots. Used to detect patterns over time.
model AiMoodEntry {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // e.g. "adventurous", "cozy", "emotionally-drained", "want-something-funny"
  mood      String
  // Optional free-text the user typed that led to this mood detection
  rawInput  String?
  // Snapshot of what was recommended in response to this mood
  recommendations Json @default("[]")

  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}

// Immutable audit log of every action the AI Housekeeper executes.
model AiActionLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  toolName   String   // e.g. "add_to_shelf", "search_content"
  inputArgs  Json     // the validated arguments passed to the tool
  result     Json     // the structured result returned by the tool
  durationMs Int?     // execution time for performance monitoring

  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([toolName])
}
```

---
## 4. Model Reference

### 4.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Internal primary key. Never exposed raw in URLs. |
| `googleId` | `String` unique | The `sub` claim from Google's ID token. Used to match returning users on OAuth callback. |
| `email` | `String` unique | Stored for display and notifications. Not used as a join key. |
| `displayName` | `String` | From Google profile. User can override in future. |
| `avatarUrl` | `String?` | Google profile photo URL. Nullable in case permissions are revoked. |

**Why cuid over UUID?** cuids are URL-safe, time-ordered (better index performance on append-heavy tables), and slightly shorter. All primary keys in this schema use cuid.

---

### 4.2 Content

The catalogue of all readable titles. This is a **shared, non-user-owned** table. Think of it as a library catalogue card — many users can point to the same `Content` row via their own `ShelfEntry` and `ReadingProgress` rows.

| Field | Type | Notes |
|---|---|---|
| `slug` | `String` unique | Human-readable URL identifier. Generated from title on creation, e.g. `solo-leveling`. Used in frontend routes (`/read/solo-leveling`). |
| `sourceUrl` | `String?` | The canonical external URL for scraped content. Nullable for first-party / uploaded content. |
| `sourceSite` | `String?` | Normalised source identifier (e.g. `royalroad`, `mangadex`). Enables filtering by source in the Explore Engine. |
| `metadata` | `Json` | Format-specific fields. See below. |
| `chapterCount` | `Int` | Denormalised aggregate. Updated by a background sync job, not a live COUNT query. |

**`metadata` JSON shapes by ContentType:**

```typescript
// WEB_NOVEL / LIGHT_NOVEL
{
  genres: string[],          // e.g. ["Fantasy", "Cultivation"]
  tags: string[],            // e.g. ["Male Lead", "Strong to Stronger"]
  totalChapters: number | null,
  volumeCount: number | null,
  isLicensed: boolean
}

// COMIC / MANGA / WEBTOON
{
  genres: string[],
  tags: string[],
  totalChapters: number | null,
  totalVolumes: number | null,
  readingDirection: "ltr" | "rtl" | "vertical",
  isColoured: boolean
}

// EBOOK
{
  genres: string[],
  isbn: string | null,
  pageCount: number | null,
  fileFormat: "epub" | "pdf" | "mobi"
}
```

---

### 4.3 Chapter

Each row represents one readable unit: a chapter of a novel, an issue/episode of a comic, or a page group.

| Field | Type | Notes |
|---|---|---|
| `number` | `Float` | Float to support decimal chapters (12.5, side stories at 0.5). Unique per content. |
| `sourceUrl` | `String` | Where the actual readable content lives — an external URL or a CDN path for self-hosted content. |

---

### 4.4 Shelf

A named collection owned by a user. Shelves serve two purposes:

1. **System shelves** (`isDefault: true`) — created automatically on user signup: `Reading`, `Completed`, `On Hold`, `Dropped`, `Plan to Read`. Their names map to `ReadingStatus` enum values.
2. **Custom shelves** (`isDefault: false`) — user-created, e.g. `Weekend Binge`, `Classics`, `Shared with Friend`.

The `isPublic` flag is scaffolded now for the future Community layer. It has no behaviour in Phase 1.

---

### 4.5 ShelfEntry

The join table between `Shelf` and `Content`. Carries only shelf-specific metadata:

- `sortOrder` — user-defined sort position within the shelf.
- `note` — a personal annotation on this specific shelf entry.

There is a `@@unique([shelfId, contentId])` constraint — a title can only appear on a given shelf once.

---

### 4.6 ReadingProgress

One row per `(user, content)` pair. Tracks the user's live reading state independently of which shelf the title is on. A title can be on multiple shelves (e.g. `Completed` and `Classics`), but there is only one `ReadingProgress` row per user per title.

| Field | Type | Notes |
|---|---|---|
| `lastChapterRead` | `Float?` | Matches `Chapter.number`. Nullable until the user starts reading. |
| `scrollPosition` | `Float?` | 0.0–1.0 fraction for ebooks/long-form content. Null for chapter-based content. |
| `status` | `ReadingStatus` | The canonical reading state. The frontend syncs this with the user's system shelf. |

**Sync rule:** When `status` is updated, the backend also moves the `ShelfEntry` to the matching system shelf. Custom shelves are never auto-modified.

---

### 4.7 AiMemory

A single row per user. Acts as the AI Housekeeper's long-term memory for that user.

| Field | Type | Notes |
|---|---|---|
| `preferenceSummary` | `String?` | Plain-text distillation of the user's taste, written by the AI after significant sessions. Injected into the system prompt at conversation start. Capped at ~2000 tokens. |
| `preferences` | `Json` | Structured preference object. Written by AI tool calls, not free-form. Always validated against a Zod schema before write. |
| `lastContext` | `Json` | What the user was last doing — used to make session resumption feel natural. |

The `preferences` and `lastContext` JSON fields are **always validated via Zod** before being written to the database. The raw `Json` type in Prisma gives us flexibility; Zod gives us the safety net.

---

### 4.8 AiMoodEntry

An append-only log of detected reading moods. Each entry is created when the AI runs the `update_reading_mood` tool. Enables trend analysis — e.g. "user typically wants cozy content on weekends."

---

### 4.9 AiActionLog

An immutable audit trail. Every time the AI executes a tool, one row is written here with the tool name, the exact input arguments, and the result. This satisfies the Constitution's transparency rule (§7.4) and provides the data needed to debug AI behaviour in production.

---
## 5. Key Relationships Explained

### User → Shelf → ShelfEntry → Content

```
User (1) ──── (many) Shelf
                        │
                     (many) ShelfEntry (many) ──── (1) Content
```

A user can have unlimited shelves. Each shelf can hold unlimited content titles. A `Content` row is never duplicated — all users point to the same shared record. User-specific data (notes, sort order) lives exclusively on `ShelfEntry`.

### User → ReadingProgress → Content

```
User (1) ──── (many) ReadingProgress (many) ──── (1) Content
```

This is separate from shelves by design. Reading progress is about *where you are*; shelves are about *how you organise*. Decoupling them means:
- A user can track progress on a title without putting it on any shelf.
- A title can be on multiple shelves (e.g. `Completed` + `Favourites`) without duplicating progress data.

### Content → Chapter

```
Content (1) ──── (many) Chapter
```

Chapters are always fetched in the context of their parent `Content`. The `@@unique([contentId, number])` constraint prevents duplicate chapters from scraping jobs.

### User → AiMemory (1:1)

Created on first AI interaction. The `preferenceSummary` is updated by a background summarisation step (not inline during chat) to keep the real-time AI loop fast.

### User → AiMoodEntry / AiActionLog (1:many, append-only)

These tables only ever get `INSERT`s, never `UPDATE`s. Their `createdAt` indexes support efficient time-range queries for analytics and the mood trend feature.

---

## 6. Design Decisions and Trade-offs

### Decision 1: Shared `Content` catalogue vs. per-user copies

**Chosen:** Shared. One `Content` row per title, referenced by many users.

**Trade-off:** A background scraping/sync job must update the shared row (chapter count, status). Multiple users benefit from the same cache. If a `Content` row is stale, it is stale for everyone until the next sync. This is acceptable — reading content is not real-time stock data.

**Rejected alternative:** Per-user `Content` copies. Simpler writes, but catastrophic storage waste at scale and impossible to aggregate community ratings.

---

### Decision 2: `metadata` as `Json` for format-specific fields

**Chosen:** A single `Json` column validated by Zod at the application layer.

**Trade-off:** Less DB-level constraint enforcement. Querying inside JSON is slower than native columns. Mitigated by: (a) Zod schema validation before every write, (b) never filtering by metadata fields — filtering is done on the indexed native columns (`type`, `sourceSite`, `status`).

**Rejected alternative:** Separate `NovelMetadata`, `ComicMetadata`, `EbookMetadata` tables joined to `Content`. Cleaner constraints but adds 3+ joins to every content query and makes adding new content types an expensive migration.

---

### Decision 3: `AiMemory` as a structured model, not a JSON blob on `User`

**Chosen:** A separate `AiMemory` model with its own migration lifecycle.

**Trade-off:** One extra join when loading AI context. Negligible at this scale.

**Rejected alternative:** A `aiMemoryJson` column on `User`. Easier but buries AI concerns inside the User model, violates the separation of concerns principle, and makes it harder to add `AiMoodEntry` / `AiActionLog` as related entities.

---

### Decision 4: Decimal `Chapter.number` (Float)

**Chosen:** `Float` for chapter numbers.

**Trade-off:** Floating-point representation means exact equality comparisons need care (use `>= lastChapterRead` ranges, not `=`). This is handled in the data-access layer.

**Accepted because:** Web novels frequently publish "12.5" interlude chapters and manga publishers use `.1` side stories. Using an `Int` would require an awkward string-parsing workaround.

---

*Last updated: September 2026 — Arcanium founding team.*