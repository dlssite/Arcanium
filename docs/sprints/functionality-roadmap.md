# Arcanium — Functionality Roadmap
## Full Codebase Audit & 4-Phase Implementation Plan

> **Status:** Active — Sprint planning document.
> **Last Updated:** September 2026
> **Author:** Senior Full-Stack Engineering Lead

---

## Table of Contents

1. [Codebase Audit & Gap Analysis](#1-codebase-audit--gap-analysis)
2. [Phase 1: Local State & Hook Layer](#2-phase-1-local-state--hook-layer-frontend-first)
3. [Phase 2: Backend API & Prisma Connection](#3-phase-2-backend-api--prisma-connection)
4. [Phase 3: Agentic AI Logic — Liber the Librarian](#4-phase-3-agentic-ai-logic--liber-the-librarian)
5. [Phase 4: Universal Content Parser & Reader Engine](#5-phase-4-universal-content-parser--reader-engine)
6. [Cross-Cutting Concerns](#6-cross-cutting-concerns)
7. [Definition of Done per Phase](#7-definition-of-done-per-phase)

---

## 1. Codebase Audit & Gap Analysis

### 1.1 Audit Summary

A full scan of `apps/web/src/` reveals that every view and component is a **static visual shell**.
All data is hardcoded inside the component body; no network calls, no shared state, no persistence.
The table below maps every hardcoded element found.

---

### 1.2 Component-by-Component Hardcoded Element Inventory

#### `HomeView.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| Greeting name | `"Good Evening, Erin"` | `useUserStore` → `user.displayName` |
| Currently Reading title | `"The Little Prince"` | `useLibraryStore` → `currentlyReading.title` |
| Currently Reading author | `"Antoine de Saint-Exupéry"` | `useLibraryStore` → `currentlyReading.author` |
| Reading progress | `68%`, `7 min left in chapter` | `useLibraryStore` → `currentlyReading.progress` |
| Reading streak | `readingStreak = 28` | `useUserStore` → `user.readingStreak` |
| Today Goal progress | `14 / 20 min` (hardcoded `70%` bar) | `useUserStore` → `user.dailyGoal` |
| `recommendedBooks` array (4 books) | Inline object array | `useLibraryStore.getRecommendations()` |
| `categories` array (5 categories) | Inline object array | `EXPLORE_CATEGORIES` constant in mock data |
| `isPlaying` state | Passed as prop from `App.jsx`, no persistence | `useReaderStore` |
| `onAddToLibrary` handler | `alert()` call | `useLibraryStore.addBook()` |

#### `LibraryView.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| `books` array (5 books) | Inline object array with title, author, progress, level, cover | `useLibraryStore.libraryBooks` |
| `filterTab` state | Local `useState` — filter logic correct but data is static | Keep local UI state; feed data from store |
| "X preserved manuscripts" count | `books.length` on the static array | `useLibraryStore.libraryBooks.length` |
| Progress bar widths | Hardcoded `progress` percentages per book | `ReadingProgress.scrollPosition` or chapter fraction from API |
| Status labels | Hardcoded strings: `"Currently Reading"`, `"Bookmarked"` | Map from `ReadingStatus` enum |

#### `ExploreView.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| `genres` array (6 genres) | Inline string array | `EXPLORE_GENRES` constant (can stay static initially, then API-driven) |
| `exploreBooks` array (6 books) | Inline object array with full book data | `useExploreStore.searchResults` fed by `GET /api/v1/content?genre=X` |
| Featured banner book | Hardcoded to `exploreBooks[3]` (Cartographer) | `useExploreStore.featuredContent` |
| Featured banner description | Hardcoded prose | `content.synopsis` from API |
| Star ratings | Hardcoded strings `"4.9"`, `"5.0"` | `content.rating` from `Content` model |
| `onAddToLibrary` handler | `alert()` call | `useLibraryStore.addBook()` |
| `onRead` handler | `alert()` call | Router navigation to `/read/:slug` |

#### `LiberView.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| Initial `messages` array (2 messages) | Hardcoded user + Liber exchange about "The Memory Stars" | `useLiberChatStore.messages` (persisted across sessions) |
| `suggestedPrompts` array (4 prompts) | Inline object array | Can remain static seeded constants OR `useLiberChatStore.suggestedPrompts` refreshed by AI |
| Action handler `handleActionClick` | `setTimeout` with hardcoded reply strings | `POST /api/v1/companion/chat` with tool-call response |
| `handleSendMessage` | `setTimeout` with a generic template reply | `POST /api/v1/companion/chat` |
| Reset button conversation starter | Hardcoded greeting `"Greetings Erin..."` | Dynamic greeting using `user.displayName` |
| Liber version badge | Hardcoded `"v2.4"` | Config constant |
| Voice button `activeVoice` | Toggles local state only — no Web Speech API wired | Phase 3: `useSpeechRecognition()` hook |
| Attachment button | Renders but does nothing | Phase 3: file upload pipeline |

#### `LiberCompanionDock.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| Initial `messages` array (2 messages) | **Duplicate** of `LiberView.jsx` initial messages | `useLiberChatStore.messages` — single shared store |
| Action handler `handleAction` | **Duplicate** of `LiberView` handler with identical `setTimeout` logic | `useLiberChatHook.sendAction()` — shared hook |
| `handleSend` | **Duplicate** of `LiberView` send logic | `useLiberChatHook.sendMessage()` — shared hook |
| Liber version badge | Hardcoded `"v2.4"` (inside portrait, not dock) | Config constant |

> **Critical Finding:** `LiberView` and `LiberCompanionDock` maintain completely separate, duplicated chat state.
> A message sent in the Dock is invisible in the full LiberView and vice-versa.
> **Phase 1 must unify these into a single `useLiberChatStore`.**

#### `ProfileView.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| User name | `"Erin Vance"` | `useUserStore` → `user.displayName` |
| User title | `"Master Reader • Level 4 Scholar Archivist"` | `useUserStore` → computed from `user.archiveLevel` |
| Reading streak | `"28 Day Active Streak"` | `useUserStore` → `user.readingStreak` |
| Stats: Manuscripts | `42` | `useLibraryStore.libraryBooks.length` |
| Stats: Time Logged | `142h` | `useUserStore` → `user.totalReadingTime` |
| Stats: Archive Rank | `"Top 1%"` | `useUserStore` → `user.archiveRank` |
| `badgeIcons` array (8 badges) | Inline object array | `useUserStore.badges` from API |
| `libraryBooks` array (5 books) | **Duplicate** of `LibraryView.jsx` data (same 5 books, same covers) | `useLibraryStore.libraryBooks` — single source of truth |
| Badge modal progress text | `"5 of 8 Unlocked • Erin Vance (Level 4 Scholar)"` | Computed from `useUserStore.badges` |
| `onAddToLibrary` handler | `setSelectedBook(null)` — silently does nothing | `useLibraryStore.addBook()` |

> **Critical Finding:** `ProfileView` and `LibraryView` each maintain their own copy of the 5-book
> library array. These get out of sync the moment any mutation (add, update progress) is needed.
> **Phase 1 must eliminate this duplication via `useLibraryStore`.**

#### `CommunityView.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| `readingCircles` array (3 circles) | Inline object array | `GET /api/v1/community/circles` |
| Community member count | `"2,840 fellow scholars"` | `GET /api/v1/community/stats` |
| Challenge progress | `7,420 / 10,000 pages`, `74%` | `GET /api/v1/community/challenge/current` |
| `marginaliaPosts` array (2 posts) | Inline object array | `GET /api/v1/community/marginalia` |
| Echo counts | `{ 1: 48, 2: 32, 3: 65 }` | Optimistic UI over `POST /api/v1/community/echo/:postId` |
| Circle member counts | `342`, `819`, `215` | `circle.memberCount` from API |
| "3 Active" circles label | Hardcoded | `readingCircles.length` |

#### `BookDetailModal.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| Rating display | `"4.9 (1,240)"` hardcoded regardless of which book is open | `book.rating` + `book.ratingCount` from API |
| Reading time | `"3h 45m total"` | Computed from `book.chapterCount * avgMinutesPerChapter` |
| Chapter count | `"12 Chapters"` | `book.chapterCount` from `Content` model |
| Fallback synopsis | Long hardcoded string | Always use `book.synopsis`; remove fallback prose |
| `onRead` handler | `alert()` in `ExploreView`, triggers `setIsPlaying` in `HomeView` | Router navigation to `/read/:slug` |
| `onAddToLibrary` handler | `alert()` in `ExploreView`, silent in `ProfileView` | `useLibraryStore.addBook(book)` |

#### `BottomNav.jsx`

| Element | Hardcoded Value | Should Come From |
|---|---|---|
| Nav items array (5 items) | Inline object array | Can remain static — this is pure navigation config |
| Notification badge dot | Always rendered (always "has notification") | `useUserStore.hasUnreadNotifications` |
| Liber avatar | `avatarImg` (capybara asset) | Pure UI — appropriate as-is |

#### `DesktopSidebar.jsx` / `DesktopHeader.jsx`

> Not yet read in full audit but expected to follow same pattern as `BottomNav`.
> Sidebar likely has hardcoded user avatar + name; Header likely has hardcoded search.
> These will be addressed as part of Phase 1 user store wiring.

---

### 1.3 Duplication Map — Critical Conflicts to Resolve

| Data | Duplicated In | Resolution |
|---|---|---|
| Library books (5-book array) | `LibraryView`, `ProfileView`, `HomeView` (currently reading) | → Single `useLibraryStore` |
| Liber chat messages + handlers | `LiberView`, `LiberCompanionDock` | → Single `useLiberChatStore` |
| User name "Erin Vance" | `HomeView`, `ProfileView`, `LiberView` (reset greeting), `DesktopSidebar` | → Single `useUserStore` |
| Reading streak "28" | `HomeView`, `ProfileView` | → `useUserStore.readingStreak` |
| Recommended/Explore books | `HomeView` (4 books), `ExploreView` (6 books), overlapping titles | → `useExploreStore` or static `MOCK_CATALOGUE` |

---

## 2. Phase 1: Local State & Hook Layer (Frontend First)

**Goal:** Replace all hardcoded in-component data with a clean, typed, shared state layer.
No network calls yet. The app looks and behaves identically but is now wired for real data.

**Timeline Estimate:** 1 sprint (5–7 days)
**Depends On:** Nothing — pure frontend work.
**Blocks:** Phase 2 (API wiring replaces mock state with real fetch calls)

### 2.1 Step 1 — Domain Types (`src/types/`)

Create JSDoc-annotated type definitions (`.js` until TypeScript is added per the Constitution roadmap).
These define the shape of every domain object flowing through the app.

**Files to create:**
- `src/types/book.js` — `Book`, `LibraryBook`, `ExploreBook`, `ReadingProgress` shapes
- `src/types/companion.js` — `ChatMessage`, `ChatAction`, `SuggestedPrompt` shapes
- `src/types/user.js` — `User`, `UserBadge`, `DailyGoal`, `ReadingStats` shapes

These types directly mirror the Prisma schema in `docs/architecture/database-schema.md`.
When TypeScript is adopted (Constitution §10.1), these become Zod schemas in `packages/types/`.

### 2.2 Step 2 — Centralized Mock Store (`src/mocks/mockData.js`)

Extract every hardcoded array and object out of JSX into a single importable module.
Components never define their own data — they always import from here or from a store.

**What moves here:**
- `MOCK_LIBRARY_BOOKS` — the 5-book library array (currently duplicated 3x)
- `MOCK_EXPLORE_BOOKS` — the 6-book explore catalogue
- `MOCK_USER` — Erin Vance profile with streak, stats, badges
- `MOCK_LIBER_MESSAGES` — initial conversation seed
- `MOCK_SUGGESTED_PROMPTS` — Libers 4 suggested inquiry prompts
- `MOCK_READING_CIRCLES` — the 3 community circles
- `MOCK_MARGINALIA_POSTS` — the 2 community posts
- `MOCK_COMMUNITY_CHALLENGE` — weekly challenge progress
- `EXPLORE_GENRES` — genre filter list
- `HOME_CATEGORIES` — category browse list
- `LIBER_VERSION` — `"v2.4"` config constant

### 2.3 Step 3 — Zustand Stores (`src/stores/`)

Per the Constitution (§8.3): feature-scoped Zustand stores.
State is minimal — stores hold data + action functions. UI components call actions.

**`src/stores/useUserStore.js`**
```javascript
// State: user, dailyGoal, isAuthenticated
// Actions: setUser, updateDailyGoal, incrementStreak
```

**`src/stores/useLibraryStore.js`**
```javascript
// State: libraryBooks, currentlyReading, filterTab
// Actions: addBook, removeBook, updateProgress, setFilterTab
// Computed: getByStatus(status), getRecommendations()
```

**`src/stores/useLiberStore.js`**
```javascript
// State: messages, isTyping, suggestedPrompts, activeVoice
// Actions: sendMessage, sendAction, resetChat, setActiveVoice
// Note: Single source of truth shared by LiberView + LiberCompanionDock
```

**`src/stores/useExploreStore.js`**
```javascript
// State: exploreBooks, selectedGenre, selectedBook, featuredContent
// Actions: setGenre, selectBook, clearSelection
```

### 2.4 Step 4 — Custom Hooks (`src/hooks/`)

Thin wrappers that encapsulate store access + derived logic, keeping components clean.

**`src/hooks/useLibrary.js`**
- Returns: `{ libraryBooks, currentlyReading, filteredBooks, addBook, updateProgress, setFilter }`
- Derived: filters, counts per status, `isInLibrary(bookId)`

**`src/hooks/useLiberChat.js`**
- Returns: `{ messages, isTyping, suggestedPrompts, sendMessage, sendAction, resetChat }`
- Handles the mock `setTimeout` response simulation internally
- Phase 3 upgrade: swap `setTimeout` block for `fetch(POST /api/v1/companion/chat)`

**`src/hooks/useUser.js`**
- Returns: `{ user, dailyGoal, stats, updateGoal }`

### 2.5 Step 5 — Component Wiring

Update every component to delete its local data definition and call the appropriate hook instead.
**Visual output must be pixel-identical before and after this step.**

| Component | Replace | With |
|---|---|---|
| `HomeView` | `recommendedBooks` array, `readingStreak` state, user name string | `useLibrary()`, `useUser()` |
| `LibraryView` | `books` array | `useLibrary()` |
| `ExploreView` | `exploreBooks`, `genres` arrays | `useExploreStore`, `EXPLORE_GENRES` |
| `LiberView` | `messages` state, all handlers | `useLiberChat()` |
| `LiberCompanionDock` | `messages` state, all handlers | `useLiberChat()` — same hook, same store |
| `ProfileView` | `libraryBooks` array, user data, `badgeIcons` | `useLibrary()`, `useUser()` |
| `CommunityView` | `readingCircles`, `marginaliaPosts`, challenge data | `MOCK_*` constants (Phase 2 for live API) |
| `BookDetailModal` | Hardcoded rating, chapter count, fallback synopsis | Pass complete `book` object with all fields |

### 2.6 Phase 1 Acceptance Criteria

- [ ] Zero hardcoded book/user arrays remain inside any `.jsx` component file.
- [ ] `LiberView` and `LiberCompanionDock` share identical message state: sending a message in the Dock is visible in LiberView.
- [ ] `LibraryView` and `ProfileView` show the same books from the same store; adding a book in Explore appears in both.
- [ ] `useLibraryStore.addBook(book)` called from `BookDetailModal` adds the book to the library and updates the count in `ProfileView`.
- [ ] All `alert()` calls replaced with store actions.
- [ ] App builds without errors: `pnpm --filter web build`.

---

## 3. Phase 2: Backend API & Prisma Connection

**Goal:** Stand up `services/backend`, connect Prisma to Postgres, and replace every mock store
with real `fetch` calls through `@arcanium/api-client`.

**Timeline Estimate:** 2 sprints (10–14 days)
**Depends On:** Phase 1 complete; PostgreSQL instance available (Supabase Postgres URL)
**Blocks:** Phase 3 (AI endpoints require the User, Content, and Shelf tables to exist)

### 3.1 Backend Bootstrap

**Directory:** `services/backend/`

```
services/backend/
├── prisma/
│   ├── schema.prisma        # (already designed in database-schema.md)
│   ├── seed.ts              # Seeds the 6 catalogue books + mock user Erin Vance
│   └── migrations/          # Auto-generated by prisma migrate dev
├── src/
│   ├── app.ts               # Express app factory (no listen() call — imported by server.ts)
│   ├── server.ts            # Entry point: binds port, starts listening
│   ├── middleware/
│   │   ├── auth.ts          # JWT validation middleware
│   │   ├── errorHandler.ts  # Global error → { data: null, error: { code, message } }
│   │   └── rateLimiter.ts   # express-rate-limit, tighter limits on /api/companion
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── library.routes.ts
│   │   ├── content.routes.ts
│   │   └── companion.routes.ts
│   ├── controllers/         # Route handlers — thin, delegate to services
│   ├── services/            # Business logic
│   └── ai/                  # Isolated AI orchestration (Phase 3)
└── package.json
```

### 3.2 API Routes — Phase 2 Scope

All routes are prefixed `/api/v1/`. Auth middleware applied to all non-auth routes.

#### Auth
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/auth/google` | Redirect to Google OAuth consent screen |
| `GET` | `/api/v1/auth/google/callback` | Exchange code → issue JWT + set httpOnly refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh cookie → new access JWT |
| `POST` | `/api/v1/auth/logout` | Invalidate refresh token, clear cookie |

#### User
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/user/me` | Current user profile + stats |
| `PATCH` | `/api/v1/user/me` | Update display name, avatar |
| `GET` | `/api/v1/user/me/goals` | Daily reading goal state |
| `PATCH` | `/api/v1/user/me/goals` | Update daily goal target |

#### Library (Shelves + Progress)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/library` | All user shelves with entries + progress |
| `POST` | `/api/v1/library/shelves` | Create a new custom shelf |
| `POST` | `/api/v1/library/shelves/:shelfId/entries` | Add content to a shelf (`add_to_shelf` tool target) |
| `DELETE` | `/api/v1/library/shelves/:shelfId/entries/:contentId` | Remove from shelf |
| `PUT` | `/api/v1/library/progress/:contentId` | Upsert reading progress (chapter, scroll position, status) |
| `GET` | `/api/v1/library/progress/:contentId` | Get progress for a single title |

#### Content (Catalogue)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/content` | List/search catalogue. Query params: `genre`, `type`, `q`, `page`, `limit` |
| `GET` | `/api/v1/content/:slug` | Single content record with chapters |
| `GET` | `/api/v1/content/:slug/chapters` | Paginated chapter list |
| `GET` | `/api/v1/content/:slug/chapters/:number` | Single chapter content |

### 3.3 Frontend: Replace Mocks with API Calls

Once the backend is running, Phase 1 hooks are upgraded in-place.
The component interfaces stay identical — only the data source changes.

**Per the Constitution (§8.1): TanStack Query is mandatory for all server state.**

```
apps/web/src/
├── features/
│   ├── library/
│   │   ├── queryKeys.ts
│   │   ├── useLibraryQuery.ts    # replaces useLibraryStore mock data
│   │   └── useProgressMutation.ts
│   ├── explore/
│   │   ├── queryKeys.ts
│   │   └── useContentQuery.ts
│   └── user/
│       ├── queryKeys.ts
│       └── useUserQuery.ts
└── stores/
    └── (Zustand retained for client-only UI state: activeTab, readerSettings, etc.)
```

**Migration path per hook:**
- `useLibrary()` → Wraps `useQuery({ queryKey: LIBRARY_KEYS.all, queryFn: apiClient.getLibrary })`
- `useUser()` → Wraps `useQuery({ queryKey: USER_KEYS.me, queryFn: apiClient.getMe })`
- `addBook()` mutation → `useMutation` + `invalidateQueries(LIBRARY_KEYS.all)`
- `updateProgress()` mutation → `useMutation` with optimistic update

### 3.4 `packages/api-client` Setup

Per Constitution §8.4: all API communication through `@arcanium/api-client`.

```typescript
// packages/api-client/src/index.ts
// Reads VITE_API_BASE_URL at build time
// Handles: auth header injection, token refresh, response envelope unpacking, error normalization
export const apiClient = {
  getMe: () => get<User>("/user/me"),
  getLibrary: () => get<LibraryResponse>("/library"),
  addToShelf: (shelfId, contentId) => post("/library/shelves/" + shelfId + "/entries", { contentId }),
  updateProgress: (contentId, data) => put("/library/progress/" + contentId, data),
  searchContent: (params) => get<ContentPage>("/content", params),
  getContent: (slug) => get<Content>("/content/" + slug),
  // Phase 3 additions:
  sendCompanionMessage: (payload) => post<CompanionResponse>("/companion/chat", payload),
};
```

### 3.5 Phase 2 Acceptance Criteria

- [ ] `prisma migrate dev` runs cleanly against a Supabase Postgres URL.
- [ ] `prisma db seed` populates the catalogue with the 6 demo books.
- [ ] All 5 view tabs load real data from the API (verified by disabling mock store).
- [ ] Adding a book via `BookDetailModal` → persists to DB → reloads in `LibraryView` and `ProfileView`.
- [ ] Progress update survives a browser refresh.
- [ ] All API responses follow the `{ data, error }` envelope defined in the Constitution.
- [ ] No raw `fetch` calls remain in any `.jsx` component.

---

## 4. Phase 3: Agentic AI Logic — Liber the Librarian

**Goal:** Replace the `setTimeout` mock responses in `useLiberChat` with a real LLM function-calling
loop. Libers quick-action buttons execute actual backend tool calls that mutate real data.

**Timeline Estimate:** 1–2 sprints (7–14 days)
**Depends On:** Phase 2 complete (library API must exist for add_to_shelf tool to work)
**Blocks:** Phase 4 (reader engine is unlocked by `fetch_chapter_passage` tool)

### 4.1 Backend: Companion Chat Endpoint

**Route:** `POST /api/v1/companion/chat`

**Request body:**
```json
{
  "message": "string",
  "sessionId": "string (optional)",
  "context": {
    "currentBookSlug": "string | null",
    "currentChapter": "number | null"
  }
}
```

**Response body:**
```json
{
  "data": {
    "reply": "string",
    "actions": ["string"] | null,
    "toolCallsMade": [{ "tool": "string", "result": "object" }] | null
  }
}
```

**Backend orchestration loop (`services/backend/src/ai/`):**

```
1. Load user AiMemory (preferenceSummary + lastContext) from DB
2. Build system prompt: Liber persona + user preference summary + current context
3. Send user message to LLM with tool definitions
4. If LLM returns tool_call:
   a. Validate args via Zod
   b. Execute the backend tool (same service layer as REST routes)
   c. Write AiActionLog row
   d. Return tool result to LLM for final reply
5. Return { reply, actions (suggested follow-ups), toolCallsMade } to frontend
6. Async (non-blocking): update AiMemory.lastContext, append AiMoodEntry if mood detected
```

### 4.2 AI Tool Definitions

Per Constitution §7.1: structured function calls only. No text parsing.

| Tool Name | Trigger | What It Does | Maps To API |
|---|---|---|---|
| `add_to_shelf` | "Add to Library" button | Adds a content ID to the users Reading shelf | `POST /api/v1/library/shelves/:defaultShelfId/entries` |
| `fetch_book_details` | "Tell me more" button | Returns synopsis, chapter count, rating for a slug | `GET /api/v1/content/:slug` |
| `get_chapter_passage` | "Read passage" button | Returns the text of a requested chapter/excerpt | `GET /api/v1/content/:slug/chapters/:number` |
| `search_content` | Mood/genre request | Searches catalogue with filters | `GET /api/v1/content?q=...&genre=...` |
| `update_reading_mood` | Any message | Logs mood snapshot to AiMoodEntry | Internal DB write |
| `get_reading_recommendations` | Explicit request | Returns personalized book list | `GET /api/v1/content?personalized=true` |
| `set_reading_goal` | Goal-setting request | Updates daily reading goal | `PATCH /api/v1/user/me/goals` |

### 4.3 Frontend: Hook Upgrade

`useLiberChat.js` upgrade — swap `setTimeout` block for real API call:

```javascript
// Before (Phase 1 mock):
setTimeout(() => {
  setMessages(prev => [...prev, { sender: "liber", text: hardcodedReply }]);
}, 1000);

// After (Phase 3 real):
const response = await apiClient.sendCompanionMessage({ message: text, context });
setMessages(prev => [...prev, {
  sender: "liber",
  text: response.data.reply,
  actions: response.data.actions,
}]);
// Tool calls that mutated library state → invalidate TanStack Query cache
if (response.data.toolCallsMade?.some(t => t.tool === "add_to_shelf")) {
  queryClient.invalidateQueries(LIBRARY_KEYS.all);
}
```

### 4.4 Voice Interaction (Web Speech API)

The Mic button in `LiberView` and `LiberCompanionDock` is already rendered — it just toggles a visual state.
Phase 3 wires it to the browser-native Web Speech API.

**`src/hooks/useSpeechInput.js`**
```javascript
export function useSpeechInput({ onResult, onError }) {
  // Uses window.SpeechRecognition || window.webkitSpeechRecognition
  // Returns: { isListening, startListening, stopListening, isSupported }
}
```

**`src/hooks/useSpeechOutput.js`**
```javascript
export function useSpeechOutput() {
  // Uses window.speechSynthesis
  // Returns: { speak(text), stop, isSpeaking, isSupported }
}
```

The "Read passage" action button will call `useSpeechOutput.speak(passage)` when the tool returns
chapter text, creating a native read-aloud experience without any third-party TTS service.

### 4.5 Phase 3 Acceptance Criteria

- [ ] Typing a message in `LiberView` or `LiberCompanionDock` calls the real backend and returns a real LLM response.
- [ ] Clicking "Add to Library" actually adds the book to the DB and the library count updates.
- [ ] Clicking "Read passage" returns a real chapter excerpt from the content catalogue.
- [ ] `AiActionLog` receives one row per tool call (verified via DB query).
- [ ] Mic button activates `SpeechRecognition`; transcribed text populates the input.
- [ ] "Read passage" response is read aloud via `SpeechSynthesis`.
- [ ] AI feature is fully disabled when `FEATURE_FLAG_AI_HOUSEKEEPER=false`.

---

## 5. Phase 4: Universal Content Parser & Reader Engine

**Goal:** Build the backend scraping proxy to fetch and parse external web novel/comic URLs,
and implement the offline-first reading session cache for active readers.

**Timeline Estimate:** 2–3 sprints (14–21 days)
**Depends On:** Phase 2 (Chapter model must exist), Phase 3 (get_chapter_passage tool is a consumer)
**Blocks:** Nothing — this is the final capability layer.

### 5.1 Backend: Content Scraping Proxy

**Route:** `POST /api/v1/admin/content/ingest`

The ingestion pipeline accepts a URL and a content type, scrapes the source, and populates the
`Content` + `Chapter` tables.

```
services/backend/src/scraper/
├── scraperRouter.ts          # Dispatches to the right parser by sourceSite
├── parsers/
│   ├── royalroad.parser.ts
│   ├── mangadex.parser.ts
│   └── generic.parser.ts     # Fallback: readability.js for generic web pages
└── scraperScheduler.ts       # Bull queue for background chapter sync jobs
```

**Scraping strategy:**
- Parse with `cheerio` (server-side HTML parser) for structured sites.
- Fall back to `@mozilla/readability` for unstructured article-style web pages.
- Images (manga/comics): download to R2/S3 object storage; store CDN URL in `Chapter.sourceUrl`.
- Never serve raw external HTML to the client — always proxy through the backend.

**Rate limiting & ethics:**
- Respect `robots.txt` and `Crawl-Delay` directives.
- Cache aggressively: a chapter fetched once is stored in the DB forever (unless flagged stale).
- Configurable request delay per `sourceSite` in environment variables.

### 5.2 Frontend: Reader View

New route: `/read/:slug/:chapter`

```
apps/web/src/features/reader/
├── ReaderView.jsx            # Full-screen immersive reading layout
├── ReaderToolbar.jsx         # Chapter nav, font size, theme, TTS button
├── ChapterContent.jsx        # Renders novel text OR manga image pages
├── useReader.js              # Orchestrates progress tracking + offline cache
└── queryKeys.js
```

**Offline-First Strategy (Constitution §8.2):**

When a user opens a chapter, the next 2 chapters are pre-fetched and stored in IndexedDB.

```javascript
// useReader.js — offline-first chapter fetch
async function getChapter(slug, number) {
  const cached = await idb.get("chapters", `${slug}:${number}`);
  if (cached) return cached;  // serve from cache instantly
  const chapter = await apiClient.getChapter(slug, number);
  await idb.put("chapters", chapter, `${slug}:${number}`);
  prefetchAhead(slug, number + 1, number + 2);  // warm cache for next chapters
  return chapter;
}
```

**Progress sync:**
- Scroll position saved to IndexedDB every 5 seconds (debounced).
- On chapter completion: `PUT /api/v1/library/progress/:contentId` mutation.
- Optimistic: progress bar updates instantly before server confirms.

### 5.3 Reader UX Requirements

These are derived directly from the existing visual shell and Constitution principles.

| Feature | Implementation |
|---|---|
| Font size adjustment | `useReaderStore` → CSS variable on reader container |
| Light / Dark / Sepia themes | `useReaderStore` → body class, persisted via Zustand `persist` |
| TTS Read-Aloud | `useSpeechOutput` hook from Phase 3 — reused |
| Chapter progress bar | `scrollPosition` updated every 5s → local first, synced to API |
| Offline indicator | Service Worker `fetch` event + banner if `navigator.onLine === false` |
| Image manga mode | `ChapterContent` detects `content.type === COMIC` → renders image grid |

### 5.4 Phase 4 Acceptance Criteria

- [ ] Submitting a Royal Road URL to the ingest endpoint creates a `Content` + `Chapter` records.
- [ ] `/read/:slug/1` renders Chapter 1 content fetched from the DB.
- [ ] Turning off network after loading Chapter 1 → Chapter 2 still opens (pre-cached in IndexedDB).
- [ ] Reading progress (scroll %) survives a browser refresh via IndexedDB.
- [ ] Comic/manga chapters render as an image page stack, not as text.
- [ ] Lighthouse Performance score >= 90 on the reader route.

---

## 6. Cross-Cutting Concerns

These run in parallel across all phases, not as separate sprints.

### 6.1 TypeScript Migration

The Constitution (§10.1) mandates TypeScript in strict mode. The current codebase is `.jsx`.

- **Phase 1:** Use JSDoc annotations in `.js` files to get IDE type checking without a build-tool change.
- **Phase 2 start:** Rename files to `.ts`/`.tsx`, add `tsconfig.json` to `apps/web`, enable strict mode.
- **Phase 2 end:** All `packages/types` Zod schemas are the single source of types — infer from schemas.

### 6.2 Routing

Currently the app is a single-page tab switcher — no URL routing exists.
Per the Constitution (§4.2): React Router v6+ with lazy-loaded routes.

- **Phase 2:** Add `react-router-dom` to `apps/web`.
  - `/` → `HomeView`
  - `/explore` → `ExploreView`
  - `/library` → `LibraryView`
  - `/community` → `CommunityView`
  - `/profile` → `ProfileView`
  - `/liber` → `LiberView`
  - `/read/:slug/:chapter` → `ReaderView` (Phase 4)
- Each route is a `React.lazy` code-split boundary.

### 6.3 Authentication Gate

- **Phase 2:** Add an `<AuthGate>` wrapper around all protected routes.
- Unauthenticated users are redirected to `/auth/login` which triggers Google OAuth flow.
- JWT stored in memory via `useUserStore`; refresh token in `httpOnly` cookie.

### 6.4 Feature Flags

Per Constitution §6.2:

| Flag | Controls |
|---|---|
| `FEATURE_FLAG_AI_HOUSEKEEPER` | Shows/hides Liber tab + companion dock |
| `FEATURE_FLAG_COMMUNITY` | Shows/hides Community tab |
| `FEATURE_FLAG_READER` | Shows/hides direct read links |
| `FEATURE_FLAG_VOICE_INPUT` | Shows/hides Mic button |

Implemented as `VITE_FEATURE_FLAG_*=true/false` env vars read in a `src/config/features.js` module.

---

## 7. Definition of Done per Phase

| Phase | DoD Summary |
|---|---|
| **Phase 1** | Zero hardcoded data in components. Shared stores. Unified Liber chat. `pnpm build` passes. |
| **Phase 2** | Real DB-backed API. TanStack Query replaces mock stores. Progress and library persist. Auth gate live. |
| **Phase 3** | Real LLM responses. Tool calls mutate DB. Voice input + TTS output wired. AI logs auditable. |
| **Phase 4** | External content parseable. Reader route functional offline. Comic mode renders images. Lighthouse >= 90. |

---

## Appendix: File Creation Checklist for Phase 1

```
apps/web/src/
├── mocks/
│   └── mockData.js             # All hardcoded data centralized here
├── types/
│   ├── book.js                 # Book, LibraryBook, ExploreBook, ReadingProgress
│   ├── companion.js            # ChatMessage, ChatAction, SuggestedPrompt
│   └── user.js                 # User, UserBadge, DailyGoal, ReadingStats
├── stores/
│   ├── useUserStore.js         # Zustand: user profile + stats
│   ├── useLibraryStore.js      # Zustand: library books + mutations
│   ├── useLiberStore.js        # Zustand: chat messages + Liber state
│   └── useExploreStore.js      # Zustand: explore catalogue + filters
└── hooks/
    ├── useLibrary.js           # Thin wrapper: library state + actions
    ├── useLiberChat.js         # Thin wrapper: chat state + send actions
    └── useUser.js              # Thin wrapper: user state + goal actions
```

---

*Last updated: September 2026 — Generated by Senior Full-Stack Engineering Lead, Arcanium.*
