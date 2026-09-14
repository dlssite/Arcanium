# Arcanium — The Living Archive: Engineering Constitution

> **Status:** Ratified — This is the single source of truth for all engineering decisions.
> Every rule exists because of a deliberate trade-off. If a rule feels wrong, open an ADR and propose an amendment.

---

## Table of Contents

1. [Mission Statement](#1-mission-statement)
2. [Core Principles](#2-core-principles)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Frontend Rules](#4-frontend-rules)
5. [Backend Rules](#5-backend-rules)
6. [Environment and Deployment Rules](#6-environment-and-deployment-rules)
7. [AI Integration Rules](#7-ai-integration-rules)
8. [State and Data Management Rules](#8-state-and-data-management-rules)
9. [Authentication Rules](#9-authentication-rules)
10. [Code Quality and Review Standards](#10-code-quality-and-review-standards)
11. [Forbidden Patterns](#11-forbidden-patterns)
12. [Amendment Process](#12-amendment-process)

---

## 1. Mission Statement

Arcanium exists to unify the fragmented digital reading experience. It must feel native, fast, and intelligent on any device — from a first-time visitor on the marketing landing page to a power user reading offline on mobile.

We build for the long game. Every architectural decision must survive both a scrappy MVP deployment and a scaled, self-hosted production environment without a code rewrite.

---

## 2. Core Principles

These are non-negotiable. They take precedence over personal preference, library defaults, or convenience.

### P1 — Mobile-First, Always

- Design and implement every UI component starting from the smallest viewport (320px).
- Responsive breakpoints are additive (min-width), never subtractive (max-width overrides).
- Touch targets must be at least 44x44px. Interactive elements must be reachable by thumb.
- Performance budgets are measured on a mid-range Android device on a 4G connection, not a developer MacBook.

### P2 — Modularity and Feature Toggleability

- Every major feature (AI Housekeeper, Community Layer, Explore Engine, offline sync) must be independently toggleable via environment variables or a runtime feature-flag module.
- A feature that cannot be removed without breaking other features is an architectural defect.
- New features are built inside their own directory under packages/features/ or the relevant app's src/features/ directory. They never pollute shared utilities until they are stable.

### P3 — Performance is a Feature

- Aim for a Lighthouse Performance score >= 90 on pps/marketing before every release.
- Code-split aggressively in pps/web. No route should ship more than 150KB of JavaScript (pre-gzip) in its initial chunk.
- Images must use modern formats (WebP/AVIF) with explicit width and height attributes to prevent Cumulative Layout Shift (CLS).
- Avoid loading third-party scripts synchronously. Defer or async-load everything that is not critical-path.

### P4 — Offline-First Data Layer

- The web app (pps/web) must be usable in a degraded-offline state for library browsing and reading of cached content.
- Network requests are optimistic where possible. The UI should never block waiting for a server response for data it can cache.
- Cache invalidation strategy: stale-while-revalidate for library data; cache-then-network for reading content.

### P5 — Environment Agnosticism (12-Factor)

- The application has no knowledge of where it is deployed. It only reads from environment variables.
- No BaaS SDK (Supabase client, Firebase, Amplify, etc.) may be imported in pps/web or any backend package.
- Prisma is the sole data-access layer. The database URL is a single environment variable.

### P6 — Security by Default

- Never trust the client. All authorization checks are enforced on the server.
- JWTs are validated server-side on every protected API request.
- No secrets, API keys, or credentials are ever committed to the repository. Use .env.example to document required keys.
- User-generated content is sanitized before storage and before render.

---

## 3. Monorepo Structure

The repository is a monorepo managed with pnpm workspaces. The workspace config is intentionally flat and simple.

```
arcanium/
├── apps/
│   ├── marketing/          # Astro — static marketing site
│   └── web/                # React + Vite — primary SPA
├── packages/
│   ├── api-client/         # Typed fetch wrapper for the backend API (shared by all frontends)
│   ├── ui/                 # Shared design system components (React)
│   ├── config/             # Shared ESLint, Prettier, TypeScript configs
│   └── types/              # Shared TypeScript types and Zod schemas
├── services/
│   └── backend/            # Node.js + Express + Prisma API server
├── docs/                   # All technical documentation
├── .env.example            # Canonical list of all required environment variables
├── CONSTITUTION.md         # This file
├── pnpm-workspace.yaml
└── package.json
```

### Rules

- pps/ contains user-facing applications. They may depend on packages/ but never on services/.
- packages/ contains pure, framework-agnostic shared code. A package in this directory must not import from pps/ or services/.
- services/ contains runnable backend processes. They may depend on packages/ but never on pps/.
- Cross-package imports use the workspace protocol: "@arcanium/ui": "workspace:*". Never use relative paths across workspace boundaries.

---

## 4. Frontend Rules

### 4.1 — Technology Mandates

| Application | Framework | Renderer | Rationale |
|---|---|---|---|
| pps/marketing | Astro | Static (SSG) | Zero-JS by default, perfect Lighthouse scores, SEO-first |
| pps/web | React + Vite | Client-Side SPA (CSR) | Blazing-fast HMR, logic reusable for React Native, no SSR complexity |

- **Next.js is permanently prohibited.** Its SSR/hydration complexity conflicts with our offline-first, CSR-native architecture. If SSR is ever needed, the ADR process must be followed first.
- **No other meta-framework** (Remix, SvelteKit, Nuxt, etc.) may be introduced without an approved ADR.

### 4.2 — apps/web (React + Vite) Rules

- **File-based feature organization.** Each feature lives in src/features/<feature-name>/ with its own components, hooks, and API-client calls co-located.
- **Routing:** React Router v6+ with lazy-loaded route components (React.lazy + Suspense). Every route is a code-split boundary.
- **Styling:** Tailwind CSS is the primary styling tool. Component-scoped CSS Modules are acceptable for complex, dynamic styles that Tailwind cannot cleanly express. Inline styles are forbidden except for dynamic values (e.g., computed widths).
- **State management:**
  - Server state (API data): React Query (TanStack Query). No exceptions.
  - Global client state: Zustand. Keep stores small and feature-scoped.
  - Local component state: useState / useReducer.
- **No direct etch calls in components.** All API calls go through the @arcanium/api-client package.
- Core business logic (hooks, state, API calls) must be framework-agnostic enough to be ported to React Native. Avoid web-only APIs inside logic hooks.

### 4.3 — apps/marketing (Astro) Rules

- Default to zero client-side JavaScript. Every page must render fully without JS.
- Interactive UI islands (e.g., a mobile menu toggle) use Astro's client:load directive only when truly necessary.
- Content sourced from markdown files in pps/marketing/src/content/.
- No backend calls at runtime. All data is build-time static or fetched via public, unauthenticated CDN endpoints.

### 4.4 — Shared UI Package

- packages/ui exports React components only.
- Astro components that need shared visuals will adapt or re-implement them locally — they do not import React components unless they are wrapped in an Astro React island.
- Every exported component must have a corresponding Storybook story (when Storybook is set up).

---

## 5. Backend Rules

### 5.1 — Stack

- Runtime: Node.js (LTS version, pinned in .nvmrc / .node-version).
- Framework: Express.js (or Fastify — choose one per ADR, never both).
- ORM: Prisma. It is the **only** way to interact with the database.
- Database: PostgreSQL. No MySQL, SQLite (in production), or NoSQL stores may be added without an ADR.

### 5.2 — API Design

- All endpoints are RESTful and versioned: /api/v1/....
- Request and response shapes are validated with Zod on the server. The same Zod schemas live in packages/types and are shared with the frontend.
- API responses follow a consistent envelope: { data: T, error: null } on success and { data: null, error: { code, message } } on failure.
- Never expose raw Prisma model shapes to the client. Map to explicit DTOs.

### 5.3 — Prisma Rules

- Schema lives at services/backend/prisma/schema.prisma.
- All schema changes are made via migrations (prisma migrate dev). Direct database edits are forbidden.
- Seed data lives in services/backend/prisma/seed.ts.
- The DATABASE_URL is the single environment variable that controls the database connection. No other database config exists in code.

---

## 6. Environment and Deployment Rules

This section is the enforcement of the 12-Factor App methodology. See docs/architecture/monorepo-and-deployment.md for the full migration path between phases.

### 6.1 — The Golden Rule

> **The codebase must not know where it is deployed.** Phase 1 (Render + Netlify + Supabase Postgres) and Phase 2 (Dockerized KVM VPS) must be achievable by changing environment variables alone — zero code changes.

### 6.2 — Environment Variable Management

- .env.example at the repository root is the canonical, committed list of every required environment variable with descriptions. It contains no real values.
- .env files are gitignored. Every developer copies .env.example to .env and fills in local values.
- Each app and service has its own .env.example in its directory for app-specific variables.
- Variables are grouped by concern:
  - DATABASE_URL — Prisma connection string (the only DB config).
  - JWT_SECRET — signing key for authentication tokens.
  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — OAuth credentials.
  - AI_PROVIDER_API_KEY, AI_PROVIDER_BASE_URL — AI service config.
  - VITE_API_BASE_URL — the backend API URL as seen from the browser (prefix VITE_ for Vite exposure).
  - PUBLIC_API_BASE_URL — the backend API URL for Astro build-time use.
  - FEATURE_FLAG_* — boolean flags to toggle features at runtime.

### 6.3 — Vendor Lock-In Prohibition

The following are **permanently banned** from any package in this repository:

- @supabase/supabase-js — use the Postgres URL directly via Prisma instead.
- irebase, @firebase/* — any Firebase SDK.
- ws-amplify, @aws-amplify/* — any Amplify SDK.
- Any BaaS client that abstracts auth, storage, or data in a way that bypasses Prisma or our own JWT layer.

**Supabase is permitted as a managed Postgres host only.** Its connection string goes into DATABASE_URL and that is the end of its influence on the codebase.

### 6.4 — Phase 1 Deployment (Testing / MVP)

| Service | Platform | Notes |
|---|---|---|
| pps/marketing | Netlify / Vercel | Static deploy via build output |
| pps/web | Netlify / Vercel | Static SPA deploy with redirect rule for client-side routing |
| services/backend | Render | Node.js web service |
| Database | Supabase Postgres (managed) | Connection string only — no Supabase SDK |

### 6.5 — Phase 2 Deployment (Production / Docker)

- Each service (pps/web, pps/marketing, services/backend) has a Dockerfile in its directory.
- A root-level docker-compose.yml orchestrates all services for local development and self-hosted production.
- The Docker image for pps/web and pps/marketing is a static Nginx container serving pre-built assets.
- The Docker image for services/backend is a minimal Node.js image with only production dependencies installed.
- All secrets are injected via Docker environment variables or a secrets manager. No secrets are baked into images.

---

## 7. AI Integration Rules

The AI Housekeeper is a first-class feature, not a chatbot bolted on at the end. These rules govern how it is built and how it interacts with the rest of the application.

### 7.1 — Architecture: Function Calling, Not Text Generation

- The AI Housekeeper must interact with the application via **structured function calls** (tool use), not by generating free text that the frontend parses.
- The backend exposes a defined, versioned set of **AI-callable tools** (e.g., dd_to_library, start_reading, get_mood_recommendations, set_reading_goal). The AI selects and invokes these tools; it does not construct API calls itself.
- This architecture is provider-agnostic. The AI provider (OpenAI, Anthropic, Gemini, etc.) is configured entirely via AI_PROVIDER_API_KEY and AI_PROVIDER_BASE_URL.

### 7.2 — Security

- **The AI never has direct database access.** All AI-triggered actions go through the same backend API endpoints that the frontend uses, with the same authorization middleware.
- AI function calls are executed server-side. The frontend sends the user's natural-language message to the backend; the backend orchestrates the AI + tool loop and returns a structured response to the frontend.
- Every tool definition includes explicit input validation (Zod). The AI cannot pass malformed data to a tool.
- Rate-limit AI endpoints aggressively. Cost control is a security concern.

### 7.3 — Isolation

- All AI orchestration logic lives in services/backend/src/ai/. It is isolated from the core business logic.
- The AI module is toggleable via the FEATURE_FLAG_AI_HOUSEKEEPER=true/false environment variable. When disabled, the backend returns a graceful "feature unavailable" response and the frontend hides the AI interface.

### 7.4 — Transparency

- Every AI-triggered action must be auditable. Log the user ID, the tool called, the input parameters, and the timestamp.
- The UI must clearly distinguish AI-suggested actions from user-initiated actions.

---

## 8. State and Data Management Rules

### 8.1 — Server State (Remote Data)

- **TanStack Query is mandatory** for all server-state management in pps/web. No raw useEffect + etch patterns.
- Query keys are defined as constants in the relevant eatures/*/queryKeys.ts file. Hardcoded string keys are forbidden.
- Background refetching is enabled by default. Stale time should be configured per-query based on how frequently the data changes.
- Mutations must invalidate related queries on success.

### 8.2 — Offline-First Caching Strategy

- **Service Worker:** pps/web uses a Service Worker (via Workbox or a custom implementation) to cache static assets and API responses.
- **Library data:** Cached with a stale-while-revalidate strategy. Users see their library instantly; it updates in the background.
- **Reading content:** Pre-fetched and stored in IndexedDB when a user bookmarks or begins reading a title. The reader must be functional with zero network connectivity for cached content.
- **Cache invalidation:** Server responses include ETag or Last-Modified headers. The client checks these before re-downloading content.

### 8.3 — Global Client State

- Zustand is the global client-state manager. Its use should be minimal — prefer co-locating state in components or lifting to the nearest common ancestor.
- Zustand stores are feature-scoped: useReaderStore, useHousekeeperStore, useLibraryStore. One god-store is forbidden.
- Persistence (to localStorage or IndexedDB) is done via the Zustand persist middleware, not ad-hoc localStorage.setItem calls.

### 8.4 — API Communication

- All API communication goes through the @arcanium/api-client package.
- The pi-client package is a typed wrapper around etch. It reads VITE_API_BASE_URL (injected at build time) to know where the backend is.
- The client handles authentication header injection, response envelope unpacking, and error normalization.
- Never call etch directly in a component or a page.

---

## 9. Authentication Rules

### 9.1 — Strategy

- **Google Sign-In is the primary authentication method.** We use the OAuth 2.0 Authorization Code flow, not the implicit flow.
- The backend handles the OAuth callback, exchanges the code for tokens, validates the Google ID token, creates or retrieves the user record in Postgres via Prisma, and issues a **signed JWT** to the client.
- The frontend stores the JWT in memory (React state) or a httpOnly cookie, never in localStorage, to prevent XSS token theft.

### 9.2 — No BaaS Auth

- Do not use Supabase Auth, Firebase Auth, Clerk, Auth0, or any third-party auth service.
- Our backend owns the auth flow end-to-end. This is non-negotiable for Phase 2 self-hosting.

### 9.3 — Token Management

- JWTs are short-lived (15–60 minutes). Refresh tokens are stored in httpOnly cookies.
- The @arcanium/api-client handles transparent token refresh. Components never manage token lifecycle.
- On logout, both the access token and refresh token are invalidated.

---

## 10. Code Quality and Review Standards

### 10.1 — TypeScript

- TypeScript is mandatory in all packages, apps, and services. The compiler is configured in strict mode.
- ny is forbidden. Use unknown and perform type narrowing. Disable-comments (// @ts-ignore) require a justification comment.
- All shared data shapes (API request/response, Prisma model extensions) must be defined as Zod schemas in packages/types. Types are inferred from schemas, not written separately.

### 10.2 — Formatting and Linting

- Prettier handles formatting. It is non-negotiable. No manual formatting arguments.
- ESLint enforces code quality. Shared configs live in packages/config/eslint/.
- Lint and format checks run in CI. A PR with lint errors will not be merged.

### 10.3 — Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| React components | PascalCase | BookCard.tsx |
| Hooks | camelCase, use prefix | useLibraryData.ts |
| Utility functions | camelCase | ormatReadingTime.ts |
| Zustand stores | camelCase, use prefix | useReaderStore.ts |
| Constants | SCREAMING_SNAKE_CASE | MAX_CACHED_TITLES |
| Prisma models | PascalCase (singular) | Book, UserLibrary |
| API routes | kebab-case | /api/v1/user-library |

### 10.4 — Commit Messages

Follow Conventional Commits: <type>(<scope>): <description>

- Types: eat, ix, docs, style, 
efactor, perf, 	est, chore, ci
- Scope: the workspace package or app name (e.g., web, ackend, ui, docs)
- Example: eat(web): add offline reading mode for cached chapters

---

## 11. Forbidden Patterns

These patterns are categorically banned. No exceptions without an approved ADR.

| Pattern | Why It's Banned |
|---|---|
| Next.js in any app | Introduces SSR complexity that conflicts with our CSR/offline-first architecture |
| BaaS SDKs (@supabase/supabase-js, Firebase, Amplify) | Creates vendor lock-in; violates Phase 2 self-hosting requirement |
| Direct database queries outside Prisma | Bypasses the single data-access abstraction layer |
| localStorage for JWT storage | Vulnerable to XSS token theft |
| Raw etch calls in React components | Bypasses the pi-client; produces untested, inconsistent error handling |
| ny type in TypeScript | Destroys type safety; hides bugs |
| Hardcoded API URLs or secrets in source code | Violates 12-Factor config; creates environment-specific builds |
| Synchronous third-party script loading | Blocks rendering; destroys performance scores |
| Feature code in shared packages/ before stabilization | Pollutes shared code with unvetted abstractions |
| god-component or god-store (>300 lines, >5 responsibilities) | Violates the Single Responsibility Principle; becomes untestable |

---

## 12. Amendment Process

This constitution is a living document but not a casual one. To change a rule:

1. **Open an ADR** in docs/adrs/ using the template. Title it ADR-NNNN: <brief title>.
2. **State the problem** — what is the current rule, why is it insufficient for the current situation?
3. **Propose the change** — what is the new rule or exception?
4. **Document the trade-offs** — what do we gain and what do we give up?
5. **Get consensus** — the ADR must be reviewed and approved by at least two contributors.
6. **Update this file** — amend the relevant section and link to the ADR in a comment.

Small clarifications (typos, examples, non-normative notes) can be made directly via PR.

---

*Last updated: September 2026 — Arcanium founding team.*