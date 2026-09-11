# Arcanium Web App — Sprint Execution Plan

> **Source:** `docs/audits/web-app-audit.md`
> **Date:** September 2026
> **Owner:** Senior Full-Stack Engineering Lead

Sprints are ordered strictly by dependency. Each one is self-contained and shippable.

---

## Sprint 1 — URL Routing & Layout Reorganisation

**Goal:** Replace the `useState('home')` tab-switcher with proper React Router v6 URL routes.
Each view becomes a `React.lazy` code-split boundary. Move layout components into
`src/components/layout/`.

**Fixes Constitution violations:** §4.2 (lazy routes), P3 (code splitting <150KB per route)

**Files touched:**
- `src/AppRouter.tsx` — add lazy routes for all 6 views
- `src/App.jsx` — gutted; becomes a thin layout shell only (no more tab state)
- `src/components/BottomNav.jsx` → `src/components/layout/BottomNav.jsx`
- `src/components/DesktopSidebar.jsx` → `src/components/layout/DesktopSidebar.jsx`
- `src/components/DesktopHeader.jsx` → `src/components/layout/DesktopHeader.jsx`
- `src/components/LiberCompanionDock.jsx` → `src/components/layout/LiberCompanionDock.jsx`

**Acceptance criteria:**
- [ ] Navigating to `/explore` renders ExploreView; browser back returns to previous route
- [ ] Each view lazy-loads (visible in Network tab as a separate JS chunk)
- [ ] BottomNav and DesktopSidebar use `useNavigate` instead of `setActiveTab` prop
- [ ] `App.jsx` no longer contains `useState('home')`
- [ ] `pnpm --filter web build` passes with no errors

---

## Sprint 2 — View Data Wiring

**Goal:** Ensure ExploreView, LibraryView, and ProfileView fully consume real API data.
Wire ProfileView badges to real user data from `useUser()`. Confirm `BookDetailModal`
mutations call the real API.

**Fixes audit items:** H1 (ProfileView mock badges), H2 (API wiring incomplete)

**Files touched:**
- `src/components/ExploreView.jsx` — already largely wired; verify & clean up mock fallbacks
- `src/components/LibraryView.jsx` — already wired; verify loading states
- `src/components/ProfileView.jsx` — replace `MOCK_USER_BADGES` with `useUser()` data
- `src/stores/useUserStore.js` — add `badges` field hydrated by `useSyncUser`
- `src/features/auth/hooks/useSyncUser.ts` — hydrate badges + stats from API
- `src/features/auth/hooks/useCurrentUser.ts` — confirm returns badges + stats fields
- `src/hooks/useUser.js` — expose `badges` from store

**Acceptance criteria:**
- [ ] ProfileView badge section shows real badges from `user.badges`; `MOCK_USER_BADGES` import removed
- [ ] Stats (manuscripts, hours, rank) come from `useUser().stats`, not mock constants
- [ ] Adding a book from ExploreView → BookDetailModal persists to DB → appears in LibraryView
- [ ] LibraryView shows loading skeleton while `useLibraryQuery` is in-flight

---

## Sprint 3 — Feature Flags Config Module

**Goal:** Create `src/config/features.ts` that reads all `VITE_FEATURE_FLAG_*` env vars.
Gate the Liber tab/dock, Community tab, and Mic button behind the appropriate flags.

**Fixes Constitution violations:** P2 (feature toggleability), §6.2 (feature flag env vars)

**Files touched:**
- `src/config/features.ts` — NEW: reads VITE_FEATURE_FLAG_* env vars
- `src/components/layout/BottomNav.jsx` — gate Community + Liber behind flags
- `src/components/layout/DesktopSidebar.jsx` — same
- `src/components/LiberView.jsx` — gate mic button behind FEATURE_FLAG_VOICE_INPUT
- `src/components/LiberCompanionDock.jsx` — same
- `apps/web/.env.example` — document all VITE_FEATURE_FLAG_* vars

**Acceptance criteria:**
- [ ] Setting `VITE_FEATURE_FLAG_AI_HOUSEKEEPER=false` hides Liber tab and dock
- [ ] Setting `VITE_FEATURE_FLAG_COMMUNITY=false` hides Community tab
- [ ] Setting `VITE_FEATURE_FLAG_VOICE_INPUT=false` hides mic button
- [ ] All flags default to `true` when env var is absent (safe default = features on)
- [ ] `apps/web/.env.example` lists every VITE_FEATURE_FLAG_* var with descriptions

---

## Sprint 4 — Missing AI Tools

**Goal:** Build the three missing backend AI tools that Liber needs for its quick-action buttons.

**Fixes audit items:** H4 (missing fetch-book-details, get-chapter-passage, set-reading-goal)

**Files touched (all in `services/backend/src/ai/tools/`):**
- `fetch-book-details.tool.ts` — NEW: calls contentService.getBySlug, returns synopsis + metadata
- `get-chapter-passage.tool.ts` — NEW: returns first available chapter text for a slug
- `set-reading-goal.tool.ts` — NEW: calls PATCH /api/v1/user/me goals (or direct service call)
- `tools/index.ts` — register all three new tools in ALL_TOOL_DEFINITIONS

**Acceptance criteria:**
- [ ] "Tell me more" action in Liber triggers `fetch_book_details` tool → real synopsis returned
- [ ] "Read passage" action triggers `get_chapter_passage` tool → real chapter text returned
- [ ] Asking Liber to "set my reading goal to 30 minutes" triggers `set_reading_goal` tool → goal updated in DB
- [ ] All three tools write to `AiActionLog`
- [ ] Backend builds without errors: `pnpm --filter @arcanium/backend build`

---

## Sprint 5 — Voice I/O Hooks

**Goal:** Build `useSpeechInput` and `useSpeechOutput` hooks using browser-native Web Speech API.
Wire to Liber mic button and "Read passage" action response.

**Fixes audit items:** H3 (voice I/O not built), Phase 3 acceptance criteria

**Files touched:**
- `src/hooks/useSpeechInput.ts` — NEW: SpeechRecognition wrapper
- `src/hooks/useSpeechOutput.ts` — NEW: SpeechSynthesis wrapper
- `src/components/LiberView.jsx` — wire mic button to useSpeechInput; wire passage reply to useSpeechOutput
- `src/components/LiberCompanionDock.jsx` — same
- `src/stores/useLiberStore.js` — trigger TTS when a "Read passage" tool result arrives

**Acceptance criteria:**
- [ ] Clicking mic button starts speech recognition; transcript populates input field
- [ ] Clicking mic again (or after silence) stops recognition
- [ ] When Liber returns a "Read passage" response, the text is spoken via SpeechSynthesis
- [ ] TTS respects `VITE_FEATURE_FLAG_VOICE_INPUT=false` (silent when flag off)
- [ ] `isSupported` is checked — graceful fallback message if browser lacks Speech API
- [ ] Hooks build without errors in strict TypeScript

---

## Overall Progress Tracker

| Sprint | Status | Key Outcome |
|---|---|---|
| 1 — URL Routing | ⬜ Not started | Deep-linking, code splitting, layout reorganised |
| 2 — View Wiring | ⬜ Not started | All views on real data, mock constants removed from components |
| 3 — Feature Flags | ⬜ Not started | Runtime toggle of Liber, Community, Voice |
| 4 — AI Tools | ⬜ Not started | Tell me more / Read passage / Set goal all functional |
| 5 — Voice I/O | ⬜ Not started | Mic input + TTS output live in Liber |

---

*Plan created: September 2026 — Arcanium Engineering Lead*
