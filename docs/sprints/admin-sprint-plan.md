# Arcanium — Admin Panel Sprint Plan

> **Source:** `docs/audits/admin-app-audit.md`, `CONSTITUTION.md`, full codebase review
> **Date:** September 2026
> **Owner:** Senior Full-Stack Engineering Lead
> **Status:** Active — the web app (apps/web) is Phase 4 complete. Admin is next.

---

## Context & Current Reality

`apps/admin` is a pixel-perfect, fully interactive prototype running on port 3001.
All 6 pages render and respond to user actions. Zero backend integration exists.
Every action mutates an in-memory Zustand god-store seeded from `mocks/mockData.ts`.
Refreshing the page resets everything.

**What the web app already has (reusable by admin):**
- `services/backend` is fully operational with auth, content, library, community, creator, AI, and scraper routes
- `requireRole.ts` middleware already exists and is in use
- `authenticate.ts` JWT middleware already exists
- `UserRole` enum (`USER | VERIFIED_WRITER | MODERATOR | ADMIN`) already on the `User` model
- `ContentSource`, `Chapter.bodyText`, `Content.creatorId` all migrated in Phase 4
- `POST /api/v1/auth/login` already works — returns role-embedded JWT
- `GET /api/v1/content` already exists — admin can use it immediately
- `@arcanium/api-client` workspace package ready to install in admin
- `POST /api/v1/admin/content/ingest` already built (scraper pipeline, Phase 4)

**What is missing before admin can function:**
- `User.status` field (`ACTIVE | SUSPENDED | BANNED`) — not in schema yet
- `CreatorApplication` model — not in schema
- `ModeratedContent` model — not in schema
- `FeatureFlag` model — not in schema
- 18 new backend admin API endpoints across 5 domains
- Admin login page + `<RequireAdminAuth>` route guard
- TanStack Query in admin (not installed)
- `apps/admin/.env.example`

---

## Sprint Overview

| Sprint | Name | Days | Deliverable |
|---|---|---|---|
| **A** | Foundation — Schema + Deps + Env | 2–3 | Migrations, middleware verified, deps installed |
| **B** | Auth Gate | 2 | Login page, JWT store, route guard |
| **C** | Quick Wins — Content Table + AI Playground | 1–2 | Two pages live with zero new backend work |
| **D** | User Management | 3 | Full user CRUD live with real DB |
| **E** | Feature Flags | 2 | Flags persisted in DB, toggled at runtime |
| **F** | Creators & Moderation | 3 | Applications queue + moderation live |
| **G** | Dashboard Stats + Liber Analytics | 3 | All metrics from real aggregation queries |
| **H** | Scraper Management (Phase 4 extension) | 2 | Parser cards wired to real scraper data |

**Total estimate:** ~18–20 days of focused work across 8 sprints.
**Dependency order is strict.** Each sprint unblocks the next. Do not start B before A, C before B, etc.

---

## Sprint A — Foundation (2–3 days)

> **Blocks everything.** Nothing else is possible without these changes.

### A1 — Prisma Migration: Add `User.status`

The `User` model has `role` (added in Phase 4) but no `status` field.
The admin types already define `UserStatus` — the schema just needs to catch up.

```prisma
enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
}

// Add to User model:
status UserStatus @default(ACTIVE)
```

**Migration name:** `add_user_status`

**Files:**
- `services/backend/prisma/schema.prisma` — add enum + field
- Run: `pnpm --filter @arcanium/backend db:migrate --name add_user_status`

**Acceptance:** `User` table has a `status` column defaulting to `ACTIVE` in Postgres.

---

### A2 — Prisma Migration: Add Admin-Specific Models

Three models are referenced throughout the admin UI but do not exist in the schema.
All three go in a single migration for efficiency.

```prisma
enum CreatorApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}

model CreatorApplication {
  id              String                    @id @default(cuid())
  userId          String
  user            User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  applicantName   String
  penName         String
  email           String
  portfolioUrl    String?
  sampleTitle     String
  sampleSynopsis  String                    @db.Text
  pitch           String                    @db.Text
  primaryGenre    String
  status          CreatorApplicationStatus  @default(PENDING)
  submittedAt     DateTime                  @default(now())
  reviewedAt      DateTime?
  reviewedById    String?

  @@index([status])
  @@index([userId])
}

enum ModerationStatus {
  FLAGGED
  APPROVED
  QUARANTINED
}

model ModeratedContent {
  id            String           @id @default(cuid())
  contentId     String
  content       Content          @relation(fields: [contentId], references: [id], onDelete: Cascade)
  authorId      String
  author        User             @relation("ModeratedAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  flagReason    String
  riskScore     Float            @default(0)
  status        ModerationStatus @default(FLAGGED)
  reportedAt    DateTime         @default(now())
  reviewedAt    DateTime?
  reviewedById  String?

  @@index([status])
  @@index([contentId])
}

enum FeatureFlagCategory {
  AI_LIBER
  CREATOR_ECONOMY
  CORE_READER
  SYSTEM
}

model FeatureFlag {
  key         String              @id
  name        String
  description String
  category    FeatureFlagCategory @default(SYSTEM)
  enabled     Boolean             @default(false)
  rolloutPct  Int                 @default(0)
  updatedById String?
  updatedAt   DateTime            @updatedAt

  @@index([category])
}
```

Add back-relations to `User` and `Content` for `CreatorApplication` and `ModeratedContent`.

**Migration name:** `add_admin_models`

**Files:**
- `services/backend/prisma/schema.prisma`
- Run: `pnpm --filter @arcanium/backend db:migrate --name add_admin_models`

**Acceptance:** All three tables exist in Postgres. Prisma client regenerated.

---

### A3 — Add `apps/admin/.env.example`

The admin app has no environment config at all. Create the canonical example.

```env
# ── API ────────────────────────────────────────────────────────────────────
# URL of the backend API as seen from the browser
VITE_API_BASE_URL=http://localhost:4000
```

**File:** `apps/admin/.env.example`

**Follow-up:** Every developer copies this to `apps/admin/.env` locally.

---

### A4 — Install Dependencies in Admin

Add `@arcanium/api-client` and `@tanstack/react-query` to the admin package.

```json
// apps/admin/package.json — add to "dependencies":
"@arcanium/api-client": "workspace:*",
"@tanstack/react-query": "5.56.2"
```

Run: `pnpm install`

Then wrap `main.tsx` with `QueryClientProvider`:

```tsx
// apps/admin/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30s — admin data can be slightly stale
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Acceptance:** `pnpm --filter @arcanium/admin build` passes with no errors.

---

### A5 — Verify `requireRole` Applied to All Admin Routes

`requireRole.ts` middleware already exists. The scraper router at
`POST /api/v1/admin/content/ingest` already uses it. Verify that every admin
endpoint built in subsequent sprints uses:

```typescript
router.get('/some-route', authenticate, requireRole('ADMIN', 'MODERATOR'), handler);
```

The `authenticate` middleware must come before `requireRole` on every admin route.
`requireRole` reads `req.user.role` which `authenticate` attaches.

**Files:** `services/backend/src/middleware/requireRole.ts` (no changes — already correct)

**Acceptance:** Calling any `/api/v1/admin/*` route without a valid ADMIN/MODERATOR
JWT returns `403 FORBIDDEN`. Calling with no token returns `401 UNAUTHORIZED`.

---

### Sprint A Checklist

- [ ] `User.status` field added and migrated
- [ ] `CreatorApplication`, `ModeratedContent`, `FeatureFlag` models added and migrated
- [ ] `apps/admin/.env.example` created with `VITE_API_BASE_URL`
- [ ] `@arcanium/api-client` and `@tanstack/react-query` installed in admin
- [ ] `main.tsx` wrapped with `QueryClientProvider`
- [ ] `pnpm --filter @arcanium/admin build` passes

---

## Sprint B — Auth Gate (2 days)

> **Depends on:** Sprint A complete.
> Without this sprint, the admin panel is publicly accessible to anyone who
> finds port 3001. This is a critical security gap.

### B1 — `useAdminAuthStore`

Create a Zustand store for the admin session. Mirrors the pattern in `apps/web`'s auth store.

```typescript
// apps/admin/src/stores/useAdminAuthStore.ts
import { create } from 'zustand';
import { apiClient } from '@arcanium/api-client';

interface AdminAuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  silentRefresh: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<{ accessToken: string }>(
        '/api/v1/auth/login',
        { email, password }
      );
      if (res.error) {
        set({ isLoading: false, error: res.error.message });
        return;
      }
      // Attach token to all future apiClient requests
      apiClient.setTokenGetter(() => res.data!.accessToken);
      set({ token: res.data!.accessToken, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Login failed — check connection' });
    }
  },

  logout: async () => {
    await apiClient.post('/api/v1/auth/logout');
    apiClient.setTokenGetter(() => null);
    set({ token: null, isAuthenticated: false });
  },

  silentRefresh: async () => {
    try {
      const res = await apiClient.post<{ accessToken: string }>('/api/v1/auth/refresh');
      if (res.data?.accessToken) {
        apiClient.setTokenGetter(() => res.data!.accessToken);
        set({ token: res.data!.accessToken, isAuthenticated: true });
      }
    } catch {
      set({ isAuthenticated: false });
    }
  },
}));
```

**Note:** The existing `POST /api/v1/auth/login` route already works and returns role-embedded JWTs.
After login, the admin must verify the JWT role is `ADMIN` or `MODERATOR`.
The backend already enforces this on every `/api/v1/admin/*` route.
The frontend should decode the JWT and show a friendly "insufficient permissions" message
if the user authenticated but is not an admin (rather than waiting for 403s on every request).

---

### B2 — Admin Login Page

```
apps/admin/src/pages/LoginPage.tsx
```

Simple email/password form. No Google OAuth — this is an internal operations tool.

**Design spec:**
- Full-screen dark background with the Arcanium logo
- Email + password fields (same `Input` component from `components/ui/`)
- "Sign in to Arcanium Admin" submit button
- Error state: show `useAdminAuthStore.error` below the form
- Loading state: disable button + show spinner while `isLoading`
- On success: navigate to `/` (the dashboard)

```tsx
// apps/admin/src/pages/LoginPage.tsx — skeleton
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';
import { Button, Input } from '../components/ui';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    if (useAdminAuthStore.getState().isAuthenticated) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        {/* Logo, title, form fields, error, submit button */}
      </form>
    </div>
  );
};
```

---

### B3 — `<RequireAdminAuth>` Route Guard

Wraps all protected routes. Redirects to `/login` if not authenticated.
On first mount, attempts a silent token refresh (so page reload doesn't log out the admin).

```tsx
// apps/admin/src/components/auth/RequireAdminAuth.tsx
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/useAdminAuthStore';

export const RequireAdminAuth: React.FC = () => {
  const { isAuthenticated, isLoading, silentRefresh } = useAdminAuthStore();

  useEffect(() => {
    // Attempt silent refresh on mount — restores session after page reload
    void silentRefresh();
  }, [silentRefresh]);

  if (isLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <span className="text-gray-400">Loading...</span>
    </div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
```

---

### B4 — Update `App.tsx` Routes

```tsx
// apps/admin/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { RequireAdminAuth } from './components/auth/RequireAdminAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ContentPage } from './pages/ContentPage';
import { CreatorsPage } from './pages/CreatorsPage';
import { LiberAnalyticsPage } from './pages/LiberAnalyticsPage';
import { FeatureFlagsPage } from './pages/FeatureFlagsPage';

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAdminAuth />}>
        <Route element={<AdminLayout />}>
          <Route path="/" index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="creators" element={<CreatorsPage />} />
          <Route path="ai-liber" element={<LiberAnalyticsPage />} />
          <Route path="settings" element={<FeatureFlagsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
```

---

### Sprint B Checklist

- [ ] `useAdminAuthStore.ts` created with login, logout, silentRefresh
- [ ] `LoginPage.tsx` renders and submits to `POST /api/v1/auth/login`
- [ ] On login success, dashboard is accessible
- [ ] On login failure, error message is shown
- [ ] `<RequireAdminAuth>` guard redirects unauthenticated requests to `/login`
- [ ] Page refresh attempts silent token refresh — admin stays logged in if cookie is valid
- [ ] Navigating to `localhost:3001` without auth shows the login page, not the dashboard
- [ ] `pnpm --filter @arcanium/admin build` passes

---

## Sprint C — Quick Wins: Content Table + AI Playground (1–2 days)

> **Depends on:** Sprint B (auth gate live — token available for API calls).
> These use **existing backend routes** — zero new API work needed.
> Highest value per hour of the entire plan.

### C1 — Wire Content Catalogue to Real Data

`GET /api/v1/content` already exists, is already used by `apps/web`, and returns paginated
content with search and type filters. The admin `ContentPage` just needs to call it.

**What changes:**

1. Add `adminApi.getContent()` to `@arcanium/api-client`:

```typescript
// packages/api-client/src/index.ts — add to adminApi:
adminApi: {
  // ... existing ingest
  getContent: (params?: Partial<ContentQuery>) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiClient.get<ContentListResponse>(`/api/v1/content${qs}`);
  },
}
```

2. Replace `adminStore.contentList` in `useContentCatalog.ts` with TanStack Query:

```typescript
// apps/admin/src/hooks/useContentCatalog.ts
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';
import { useAdminStore } from '../stores/adminStore';

export function useContentCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Real data from API
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'content', searchQuery, typeFilter],
    queryFn: () => adminApi.getContent({
      q: searchQuery || undefined,
      type: typeFilter !== 'ALL' ? typeFilter : undefined,
      limit: 50,
    }),
  });

  // Keep mock-only state from store for categories and parsers (until Sprint G/H)
  const categories = useAdminStore((s) => s.categories);
  const parsers = useAdminStore((s) => s.parsers);
  const addCategory = useAdminStore((s) => s.addCategory);
  const removeCategory = useAdminStore((s) => s.removeCategory);
  const triggerScraperSync = useAdminStore((s) => s.triggerScraperSync);

  const contentList = data?.data?.items ?? [];

  return {
    contentList,
    isLoading,
    isError,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    categories,
    parsers,
    addCategory,
    removeCategory,
    triggerScraperSync,
  };
}
```

3. Update `ContentPage.tsx` to handle `isLoading` and `isError` states:

```tsx
// Add loading skeleton and error fallback to the catalogue table section
{isLoading && <div className="text-gray-400 p-4">Loading catalogue...</div>}
{isError && <div className="text-red-400 p-4">Failed to load content. Check API connection.</div>}
```

**Estimated effort:** ~2 hours. Real content from the DB is immediately visible.

---

### C2 — Wire Liber Playground to Real AI

`POST /api/v1/ai/chat` already exists and is the same endpoint used by `apps/web`.
The admin playground should call the real AI instead of the `setTimeout` simulation.

**What changes:**

1. Add `companionApi` import to `useLiberAnalytics.ts`:

```typescript
// apps/admin/src/hooks/useLiberAnalytics.ts
import { companionApi } from '@arcanium/api-client';
```

2. Replace `executeLiberPromptTest` call in `handleRunSimulation`:

```typescript
const handleRunSimulation = async () => {
  if (!promptInput.trim()) return;
  setIsSimulating(true);
  const startMs = Date.now();
  try {
    const res = await companionApi.chat({
      message: promptInput,
      context: { currentBookSlug: null, currentChapter: null },
    });
    if (res.data) {
      const latencyMs = Date.now() - startMs;
      const testItem = {
        id: `test_${Date.now()}`,
        prompt: promptInput,
        response: res.data.reply,
        toolCall: res.data.toolCallsMade?.[0]
          ? {
              name: res.data.toolCallsMade[0].tool,
              args: {},
              result: res.data.toolCallsMade[0].result as Record<string, unknown>,
            }
          : undefined,
        latencyMs,
        tokensUsed: 0, // API does not currently return token count
        timestamp: 'Just now',
      };
      // Prepend to local playground history (keep in Zustand — this is UI state)
      useAdminStore.getState().playgroundHistory.unshift(testItem);
    }
    setPromptInput('');
  } finally {
    setIsSimulating(false);
  }
};
```

**Note on token count:** The current AI endpoint does not return token usage in its response
envelope. This is fine for now — display `0` or `N/A`. Token counts come from Liber Analytics
aggregation in Sprint G.

**Estimated effort:** ~2 hours. The playground becomes a genuine Liber debugger.

---

### Sprint C Checklist

- [ ] Content catalogue table shows real DB content (not mock 6-book seed)
- [ ] Content search and type filter work against the real API
- [ ] Liber playground sends real messages to `POST /api/v1/ai/chat`
- [ ] Playground displays the real LLM reply and any tool calls made
- [ ] Playground latency counter shows real round-trip time
- [ ] No mock data is used for content list or playground responses

---

## Sprint D — User Management (3 days)

> **Depends on:** Sprint A (User.status migration), Sprint B (auth gate).
> This sprint builds the 4 user management endpoints and wires the Users page.

### D1 — Backend: User Management Routes

Create `services/backend/src/routes/admin.ts` and a corresponding
`services/backend/src/services/admin.service.ts`.

Register the new router in `index.ts`:
```typescript
import { adminRouter } from './routes/admin.js';
app.use('/api/v1/admin', adminRouter);
```

**Routes to implement:**

#### `GET /api/v1/admin/users`

Query params: `search`, `role`, `status`, `page` (default 1), `limit` (default 20)

```typescript
// Returns paginated AdminUser list
// Prisma query:
const where = {
  ...(search ? {
    OR: [
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ]
  } : {}),
  ...(role && role !== 'ALL' ? { role: role as UserRole } : {}),
  ...(status && status !== 'ALL' ? { status: status as UserStatus } : {}),
};

const [users, total] = await Promise.all([
  prisma.user.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, displayName: true, avatarUrl: true,
      role: true, status: true, createdAt: true, updatedAt: true,
      _count: { select: { shelves: true, readingProgress: true } },
    },
  }),
  prisma.user.count({ where }),
]);

// Map _count to shelfCount and booksRead fields
// Return: { data: { users, total, page, limit }, error: null }
```

#### `GET /api/v1/admin/users/:id`

Returns full user profile including reading stats (same logic as `users.service.ts getMe`
but for any user by ID, not just `req.user`). Requires ADMIN role only (not MODERATOR).

#### `PATCH /api/v1/admin/users/:id/status`

Body: `{ status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }`

```typescript
// Validate status with Zod
// Forbid modifying users with role ADMIN (can't ban another admin)
// Update user.status in DB
// Return updated user
```

#### `PATCH /api/v1/admin/users/:id/role`

Body: `{ role: 'USER' | 'VERIFIED_WRITER' | 'MODERATOR' | 'ADMIN' }`

```typescript
// Requires ADMIN role (MODERATOR cannot change roles)
// Update user.role in DB
// Return updated user
```

**File structure:**
```
services/backend/src/routes/admin.ts          — router, applies authenticate + requireRole
services/backend/src/services/admin.service.ts — all admin business logic
```

---

### D2 — Extend `@arcanium/api-client` with Admin User Endpoints

```typescript
// packages/api-client/src/index.ts — extend adminApi:
getUsers: (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) => {
  const qs = params ? '?' + new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString() : '';
  return apiClient.get<{ users: AdminUser[]; total: number; page: number; limit: number }>(`/api/v1/admin/users${qs}`);
},
getUserById: (id: string) =>
  apiClient.get<AdminUser>(`/api/v1/admin/users/${id}`),
updateUserStatus: (id: string, status: string) =>
  apiClient.patch<AdminUser>(`/api/v1/admin/users/${id}/status`, { status }),
updateUserRole: (id: string, role: string) =>
  apiClient.patch<AdminUser>(`/api/v1/admin/users/${id}/role`, { role }),
```

---

### D3 — Refactor `useUserManagement.ts` with TanStack Query

Replace `adminStore.users` with `useQuery` + `useMutation`.
Keep local `useState` for `searchQuery`, `roleFilter`, `statusFilter`, `selectedUser` —
these are correct as local UI state and should not change.

```typescript
// apps/admin/src/hooks/useUserManagement.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';

export function useUserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', searchQuery, roleFilter, statusFilter],
    queryFn: () => adminApi.getUsers({
      search: searchQuery || undefined,
      role: roleFilter !== 'ALL' ? roleFilter : undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    }),
  });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const banMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      adminApi.updateUserStatus(id, currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED'),
    onSuccess: invalidateUsers,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      adminApi.updateUserStatus(id, currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'),
    onSuccess: invalidateUsers,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: invalidateUsers,
  });

  return {
    users: data?.data?.users ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    isError,
    searchQuery, setSearchQuery,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    selectedUser, setSelectedUser,
    toggleUserBan: (id: string, currentStatus: string) =>
      banMutation.mutate({ id, currentStatus }),
    toggleUserSuspend: (id: string, currentStatus: string) =>
      suspendMutation.mutate({ id, currentStatus }),
    setUserRole: (id: string, role: string) =>
      roleMutation.mutate({ id, role }),
  };
}
```

Update `UsersPage.tsx` to pass `currentStatus` to the ban/suspend handlers.
The page UI does not change — only the data source.

---

### Sprint D Checklist

- [ ] `GET /api/v1/admin/users` returns paginated users with search/role/status filters
- [ ] `GET /api/v1/admin/users/:id` returns full profile
- [ ] `PATCH /api/v1/admin/users/:id/status` updates ban/suspend in DB
- [ ] `PATCH /api/v1/admin/users/:id/role` updates role in DB
- [ ] All 4 routes require `authenticate + requireRole('ADMIN', 'MODERATOR')`
- [ ] `useUserManagement.ts` uses TanStack Query — no Zustand mock data
- [ ] Banning a user in the UI persists after page refresh
- [ ] User inspect modal shows real data
- [ ] Admin cannot ban another ADMIN account (backend rejects with 403)

---

## Sprint E — Feature Flags (2 days)

> **Depends on:** Sprint A (FeatureFlag model migrated), Sprint B (auth gate).
> This sprint resolves the Constitution tension between env-var flags (§6.2, P2)
> and runtime DB-editable flags. An ADR is required.

### E0 — Architecture Decision: DB-Stored Flags (Required ADR)

**File:** `docs/adrs/ADR-0001-feature-flags-db-vs-env.md`

**Decision:** Feature flags are stored in the `FeatureFlag` database table and read
at runtime via `GET /api/v1/admin/feature-flags`. The existing `VITE_FEATURE_FLAG_*`
env vars in `apps/web` are **not removed** — they remain as the fallback/default when
the DB has no record for a given key.

**Rationale:**
- The admin UI already treats flags as runtime-mutable with rollout percentages.
  Env-var flags require a redeploy to change — unacceptable for a live ops tool.
- DB flags are the right design for scale. The admin panel is the control plane.
- The env-var fallback means Phase 1/2 deployments work without a populated flags table.

**Migration path:**
- The backend's `requireFeatureFlag` middleware (`middleware/featureFlag.ts`) already
  exists but reads env vars. In a follow-up sprint, it can be upgraded to also check
  the DB table (DB record takes precedence over env var).

---

### E1 — Backend: Feature Flag Routes

Add to `services/backend/src/routes/admin.ts`:

#### `GET /api/v1/admin/feature-flags`

Returns all `FeatureFlag` records, ordered by category then key.
Requires `ADMIN` or `MODERATOR`.

#### `PATCH /api/v1/admin/feature-flags/:key`

Body: `{ enabled?: boolean, rolloutPct?: number, name?: string, description?: string }`

Validates with Zod. Updates the record. Sets `updatedById` to `req.user.id`.
Returns the updated flag.

#### `POST /api/v1/admin/feature-flags`

Body: `{ key, name, description, category, enabled, rolloutPct }`

Creates a new `FeatureFlag` record. `key` must be unique.
Returns the created flag.

---

### E2 — Seed Initial Feature Flags

Add to `services/backend/prisma/seed.ts` — seed the canonical flags from `mockData.ts`:

```typescript
const flagSeeds = [
  { key: 'AI_HOUSEKEEPER', name: 'Liber AI Housekeeper', category: 'AI_LIBER',
    description: 'Enables the Liber companion and all AI features', enabled: true, rolloutPct: 100 },
  { key: 'VOICE_INPUT', name: 'Voice Input', category: 'AI_LIBER',
    description: 'Enables mic input and TTS in Liber', enabled: true, rolloutPct: 100 },
  { key: 'CREATOR_ECONOMY', name: 'Creator Economy', category: 'CREATOR_ECONOMY',
    description: 'Enables creator portal and writer publishing tools', enabled: true, rolloutPct: 100 },
  { key: 'COMMUNITY', name: 'Community Layer', category: 'CREATOR_ECONOMY',
    description: 'Enables reading circles, marginalia, and challenges', enabled: true, rolloutPct: 100 },
  { key: 'READER', name: 'Reader Engine', category: 'CORE_READER',
    description: 'Enables the full-screen reading experience', enabled: true, rolloutPct: 100 },
  { key: 'OFFLINE_READER', name: 'Offline Reader', category: 'CORE_READER',
    description: 'Enables offline chapter caching via IndexedDB', enabled: true, rolloutPct: 80 },
];

for (const flag of flagSeeds) {
  await prisma.featureFlag.upsert({
    where: { key: flag.key },
    update: {},
    create: { ...flag, updatedById: null },
  });
}
```

Run: `pnpm --filter @arcanium/backend db:seed`

---

### E3 — Extend `@arcanium/api-client`

```typescript
// packages/api-client/src/index.ts — extend adminApi:
getFeatureFlags: () =>
  apiClient.get<FeatureFlag[]>('/api/v1/admin/feature-flags'),
updateFeatureFlag: (key: string, body: Partial<{ enabled: boolean; rolloutPct: number; name: string; description: string }>) =>
  apiClient.patch<FeatureFlag>(`/api/v1/admin/feature-flags/${key}`, body),
createFeatureFlag: (body: Omit<FeatureFlag, 'updatedAt' | 'updatedById'>) =>
  apiClient.post<FeatureFlag>('/api/v1/admin/feature-flags', body),
```

---

### E4 — Refactor `useFeatureFlags.ts` with TanStack Query

```typescript
// apps/admin/src/hooks/useFeatureFlags.ts
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';

export function useFeatureFlags() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => adminApi.getFeatureFlags(),
  });

  const invalidateFlags = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminApi.updateFeatureFlag(key, { enabled }),
    onSuccess: invalidateFlags,
  });

  const rolloutMutation = useMutation({
    mutationFn: ({ key, rolloutPct }: { key: string; rolloutPct: number }) =>
      adminApi.updateFeatureFlag(key, { rolloutPct }),
    onSuccess: invalidateFlags,
  });

  const createMutation = useMutation({
    mutationFn: (flag: Omit<FeatureFlag, 'updatedAt' | 'updatedById'>) =>
      adminApi.createFeatureFlag(flag),
    onSuccess: invalidateFlags,
  });

  const allFlags = data?.data ?? [];
  const filteredFlags = useMemo(() =>
    allFlags.filter(f => {
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchSearch = !searchQuery.trim() ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }),
    [allFlags, selectedCategory, searchQuery]
  );

  return {
    featureFlags: filteredFlags,
    allFlagsCount: allFlags.length,
    activeFlagsCount: allFlags.filter(f => f.enabled).length,
    isLoading,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    toggleFeatureFlag: (key: string, currentEnabled: boolean) =>
      toggleMutation.mutate({ key, enabled: !currentEnabled }),
    updateRollout: (key: string, rolloutPct: number) =>
      rolloutMutation.mutate({ key, rolloutPct }),
    addFeatureFlag: (flag: Omit<FeatureFlag, 'updatedAt' | 'updatedById'>) =>
      createMutation.mutate(flag),
  };
}
```

---

### Sprint E Checklist

- [ ] ADR-0001 written and committed to `docs/adrs/`
- [ ] `GET`, `PATCH`, `POST` feature flag routes live and role-gated
- [ ] Seed script populates canonical flags in DB
- [ ] `useFeatureFlags.ts` uses TanStack Query — no Zustand mock data
- [ ] Toggling a flag in UI persists after page refresh
- [ ] Rollout slider persists after page refresh
- [ ] "Add Flag" modal creates a new flag in DB
- [ ] All flags have a real `updatedAt` timestamp

---

## Sprint F — Creators & Moderation (3 days)

> **Depends on:** Sprint A (CreatorApplication + ModeratedContent models), Sprint B (auth gate).

### F1 — Backend: Creator Application Routes

Add to `services/backend/src/routes/admin.ts`:

#### `GET /api/v1/admin/creators/applications`

Query params: `status` (PENDING | APPROVED | REJECTED | ALL), `page`, `limit`

```typescript
// Prisma query:
const applications = await prisma.creatorApplication.findMany({
  where: status !== 'ALL' ? { status } : {},
  include: {
    user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true } }
  },
  orderBy: { submittedAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

#### `POST /api/v1/admin/creators/applications` (optional — for admin to manually create)

Or expose via the user-facing web app in a future sprint.

#### `PATCH /api/v1/admin/creators/applications/:id/approve`

```typescript
// 1. Validate application exists and is PENDING
// 2. Set application.status = APPROVED, reviewedAt = now(), reviewedById = req.user.id
// 3. Upgrade application.user.role to VERIFIED_WRITER (in same transaction)
// 4. Return updated application

await prisma.$transaction([
  prisma.creatorApplication.update({
    where: { id },
    data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: req.user.id },
  }),
  prisma.user.update({
    where: { id: application.userId },
    data: { role: 'VERIFIED_WRITER' },
  }),
]);
```

#### `PATCH /api/v1/admin/creators/applications/:id/reject`

```typescript
// Set status = REJECTED, reviewedAt, reviewedById
// Do NOT change user role
```

---

### F2 — Backend: Moderation Routes

#### `GET /api/v1/admin/moderation/stories`

Query params: `status` (FLAGGED | APPROVED | QUARANTINED | ALL), `page`, `limit`

```typescript
const stories = await prisma.moderatedContent.findMany({
  where: status !== 'ALL' ? { status } : {},
  include: {
    content: { select: { id: true, title: true, slug: true, type: true } },
    author: { select: { id: true, displayName: true, email: true } },
  },
  orderBy: { reportedAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

#### `PATCH /api/v1/admin/moderation/stories/:id/status`

Body: `{ status: 'APPROVED' | 'QUARANTINED' | 'FLAGGED' }`

```typescript
await prisma.moderatedContent.update({
  where: { id },
  data: { status, reviewedAt: new Date(), reviewedById: req.user.id },
});
```

---

### F3 — Extend `@arcanium/api-client`

```typescript
// packages/api-client/src/index.ts — extend adminApi:
getCreatorApplications: (params?: { status?: string; page?: number; limit?: number }) =>
  apiClient.get<{ applications: CreatorApplication[]; total: number }>(
    '/api/v1/admin/creators/applications' + buildQs(params)
  ),
approveCreatorApplication: (id: string) =>
  apiClient.patch<CreatorApplication>(`/api/v1/admin/creators/applications/${id}/approve`, {}),
rejectCreatorApplication: (id: string) =>
  apiClient.patch<CreatorApplication>(`/api/v1/admin/creators/applications/${id}/reject`, {}),
getModerationStories: (params?: { status?: string; page?: number; limit?: number }) =>
  apiClient.get<{ stories: ModeratedStory[]; total: number }>(
    '/api/v1/admin/moderation/stories' + buildQs(params)
  ),
updateStoryStatus: (id: string, status: string) =>
  apiClient.patch<ModeratedStory>(`/api/v1/admin/moderation/stories/${id}/status`, { status }),
```

---

### F4 — Refactor `useCreatorVerification.ts` with TanStack Query

```typescript
// apps/admin/src/hooks/useCreatorVerification.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';

export function useCreatorVerification() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'applications' | 'moderation'>('applications');
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [modStatusFilter, setModStatusFilter] = useState('ALL');

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin', 'creator-applications', appStatusFilter],
    queryFn: () => adminApi.getCreatorApplications({
      status: appStatusFilter !== 'ALL' ? appStatusFilter : undefined,
    }),
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['admin', 'moderation-stories', modStatusFilter],
    queryFn: () => adminApi.getModerationStories({
      status: modStatusFilter !== 'ALL' ? modStatusFilter : undefined,
    }),
  });

  const invalidateApps = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'creator-applications'] });
  const invalidateStories = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-stories'] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveCreatorApplication(id),
    onSuccess: invalidateApps,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectCreatorApplication(id),
    onSuccess: invalidateApps,
  });

  const storyStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateStoryStatus(id, status),
    onSuccess: invalidateStories,
  });

  return {
    activeTab, setActiveTab,
    creators: appsData?.data?.applications ?? [],
    appsLoading,
    appStatusFilter, setAppStatusFilter,
    approveCreator: (id: string) => approveMutation.mutate(id),
    rejectCreator: (id: string) => rejectMutation.mutate(id),
    moderatedStories: storiesData?.data?.stories ?? [],
    storiesLoading,
    modStatusFilter, setModStatusFilter,
    setStoryStatus: (id: string, status: string) =>
      storyStatusMutation.mutate({ id, status }),
  };
}
```

---

### Sprint F Checklist

- [ ] `GET /api/v1/admin/creators/applications` returns real applications with status filter
- [ ] Approving an application sets status to APPROVED + upgrades user to VERIFIED_WRITER in one transaction
- [ ] Rejecting an application sets status to REJECTED, does not change user role
- [ ] `GET /api/v1/admin/moderation/stories` returns moderated content records
- [ ] Story status updates persist in DB
- [ ] `useCreatorVerification.ts` uses TanStack Query
- [ ] Creators page shows real data from DB (not mock seed)
- [ ] Approving a creator application persists after page refresh

---

## Sprint G — Dashboard Stats + Liber Analytics (3 days)

> **Depends on:** Sprint A (schema), Sprint B (auth gate), Sprint D (User data exists in DB).
> This sprint wires the two purely display pages to real aggregation queries.

### G1 — Backend: `GET /api/v1/admin/stats`

This is the single most important endpoint for the dashboard. It runs multiple aggregate
queries in parallel and returns a single stats envelope.

```typescript
// services/backend/src/services/admin.service.ts

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalUsers,
    newUsersToday,
    newUsersYesterday,
    activeReadingToday,
    activeReadingYesterday,
    activeLiberChatsToday,
    activeLiberChatsYesterday,
    tokenCostThisMonth,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    // New registrations today
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    // New registrations yesterday (for % change)
    prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    // Users with reading activity today
    prisma.readingProgress.count({
      where: { lastReadAt: { gte: today } },
    }),
    prisma.readingProgress.count({
      where: { lastReadAt: { gte: yesterday, lt: today } },
    }),
    // AI chat sessions today
    prisma.aiActionLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: today } },
      _count: true,
    }).then(rows => rows.length),
    // AI chat sessions yesterday
    prisma.aiActionLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: yesterday, lt: today } },
      _count: true,
    }).then(rows => rows.length),
    // Monthly token cost: sum of AiActionLog durationMs as a proxy (or use a cost field)
    // NOTE: durationMs is not a token count. For a real token cost, the AI service
    // needs to log token usage. For now, return 0 and note this as a future enhancement.
    Promise.resolve(0),
  ]);

  const pctChange = (current: number, previous: number) =>
    previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100 * 10) / 10;

  res.json({
    data: {
      totalUsers,
      newUsersToday,
      totalUsersChange: pctChange(newUsersToday, newUsersYesterday),
      dailyReadingHours: Math.round(activeReadingToday * 1.5), // rough estimate: 1.5h avg per active reader
      dailyReadingHoursChange: pctChange(activeReadingToday, activeReadingYesterday),
      activeLiberChats: activeLiberChatsToday,
      activeLiberChatsChange: pctChange(activeLiberChatsToday, activeLiberChatsYesterday),
      monthlyTokenCost: tokenCostThisMonth,
      monthlyTokenCostLimit: 1000,
    },
    error: null,
  });
}
```

**Note on token cost:** The `AiActionLog` does not currently store token count or USD cost.
Return `0` for `monthlyTokenCost` for now. Add a `tokensUsed` and `costUsd` field to
`AiActionLog` in a future sprint when token counting is wired into the AI service.

---

### G2 — Backend: `GET /api/v1/admin/activity`

Aggregates recent platform events into a unified activity stream.
Sources: `AiActionLog`, `ReadingProgress` updates, `CreatorApplication` status changes,
`User` creations.

```typescript
// For Sprint G scope: pull from AiActionLog only, plus recent user registrations.
// A more complete activity stream can be built in a dedicated audit log table later.

const [recentAiLogs, recentUsers] = await Promise.all([
  prisma.aiActionLog.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true } } },
  }),
  prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, displayName: true, createdAt: true },
  }),
]);

// Map to AdminActivityItem shape and sort by timestamp desc
// Return: { data: { activities: AdminActivityItem[] }, error: null }
```

---

### G3 — Backend: `GET /api/v1/admin/ai/analytics`

Aggregates `AiActionLog` and `AiMoodEntry` for the Liber Analytics page.

```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const [
  totalActionsToday,
  avgLatency,
  topMoods,
  dailyTokenHistory,
] = await Promise.all([
  // Total tool calls today
  prisma.aiActionLog.count({ where: { createdAt: { gte: today } } }),
  // Average latency across all logs
  prisma.aiActionLog.aggregate({
    _avg: { durationMs: true },
    where: { durationMs: { not: null } },
  }),
  // Top moods in the last 30 days
  prisma.aiMoodEntry.groupBy({
    by: ['mood'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: { mood: true },
    orderBy: { _count: { mood: 'desc' } },
    take: 5,
  }),
  // Daily action counts for the 7-day chart
  // Use raw SQL or manual date grouping for time-series
  prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM "AiActionLog"
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `,
]);

// Map topMoods to MoodStat shape with color assignments
// Map dailyTokenHistory to TokenUsagePoint shape (cost = 0 until token tracking added)
```

---

### G4 — Extend `@arcanium/api-client`

```typescript
// packages/api-client/src/index.ts — extend adminApi:
getStats: () =>
  apiClient.get<AdminOverviewStats>('/api/v1/admin/stats'),
getActivity: (params?: { page?: number; limit?: number }) =>
  apiClient.get<{ activities: AdminActivityItem[] }>(
    '/api/v1/admin/activity' + buildQs(params)
  ),
getAiAnalytics: () =>
  apiClient.get<LiberAnalytics>('/api/v1/admin/ai/analytics'),
```

---

### G5 — Refactor `useAdminStats.ts` and `useLiberAnalytics.ts`

```typescript
// apps/admin/src/hooks/useAdminStats.ts
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';

export function useAdminStats() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30_000, // live-ish: refresh every 30 seconds
  });

  const activityQuery = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: () => adminApi.getActivity({ limit: 25 }),
    refetchInterval: 15_000,
  });

  return {
    stats: statsQuery.data?.data ?? null,
    activities: activityQuery.data?.data?.activities ?? [],
    isLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
  };
}
```

```typescript
// apps/admin/src/hooks/useLiberAnalytics.ts — replace analytics data source
const analyticsQuery = useQuery({
  queryKey: ['admin', 'ai-analytics'],
  queryFn: () => adminApi.getAiAnalytics(),
  refetchInterval: 60_000,
});

const liberAnalytics = analyticsQuery.data?.data ?? null;
```

Keep `playgroundHistory` and playground UI state in Zustand — they are client-only.

---

### Sprint G Checklist

- [ ] `GET /api/v1/admin/stats` returns real user counts, reading activity, and AI session counts
- [ ] `GET /api/v1/admin/activity` returns real recent events from DB
- [ ] `GET /api/v1/admin/ai/analytics` returns mood aggregation and daily action history
- [ ] Dashboard metric cards show real data
- [ ] Activity stream shows real AI log entries and user registrations
- [ ] Liber Analytics top moods chart shows real `AiMoodEntry` grouping
- [ ] Liber Analytics 7-day chart shows real daily tool call counts
- [ ] Both pages auto-refresh every 15–30 seconds (refetchInterval)
- [ ] `useAdminStats.ts` and `useLiberAnalytics.ts` use TanStack Query

---

## Sprint H — Scraper Management (2 days)

> **Depends on:** Sprint A, Sprint B, and the Phase 4 scraper infrastructure (already built).
> The scraper pipeline (`scraperQueue.ts`, `scraper.service.ts`, parsers) was built in Phase 4.
> This sprint exposes it through the admin UI.

### H1 — Add `ScraperConfig` Model to Schema

The scraper parsers are currently hardcoded inside `scraperQueue.ts` / `parsers/index.ts`.
For admin management, their config should live in the DB.

```prisma
enum ScraperStatus {
  OPERATIONAL
  DEGRADED
  FAILED
}

enum SelectorType {
  CHEERIO
  REST
  READABILITY
}

model ScraperConfig {
  id               String       @id @default(cuid())
  name             String
  targetDomain     String       @unique
  selectorType     SelectorType
  enabled          Boolean      @default(true)
  requestDelayMs   Int          @default(1000)
  lastRunAt        DateTime?
  lastRunStatus    ScraperStatus?
  totalCrawledAllTime Int       @default(0)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([enabled])
}
```

**Migration name:** `add_scraper_config`

Seed initial scraper configs corresponding to the existing parsers:
- Royal Road (`royalroad.com`, CHEERIO)
- MangaDex (`mangadex.org`, REST)
- Generic fallback (`*`, READABILITY)

---

### H2 — Backend: Scraper Routes

Add to `services/backend/src/routes/admin.ts`:

#### `GET /api/v1/admin/scrapers`

```typescript
// Returns all ScraperConfig records + recent run stats
const scrapers = await prisma.scraperConfig.findMany({
  orderBy: { name: 'asc' },
});

// For each scraper, count chapters scraped in the last 24h from Chapter records
// where sourceUrl LIKE '%{targetDomain}%'
// Return ScraperParser shape with live metrics
```

#### `POST /api/v1/admin/scrapers/:id/sync`

Triggers a manual scraper health check or re-crawl of known content from this domain.

```typescript
// 1. Find all Content with sourceSite = scraper.targetDomain
// 2. Queue one scraper job per content to refresh chapter counts
// 3. Update scraper.lastRunAt = now()
// 4. Return { queued: N } immediately (non-blocking)
```

**Note:** This requires BullMQ + Redis which is already set up in `scraperQueue.ts`.
If Redis is not available, run synchronously with graceful fallback (same pattern as existing scraper).

---

### H3 — Extend `@arcanium/api-client`

```typescript
// packages/api-client/src/index.ts — extend adminApi:
getScrapers: () =>
  apiClient.get<ScraperParser[]>('/api/v1/admin/scrapers'),
syncScraper: (id: string) =>
  apiClient.post<{ queued: number }>(`/api/v1/admin/scrapers/${id}/sync`),
```

---

### H4 — Refactor `useContentCatalog.ts` Parser Section

```typescript
// Replace mock parsers in useContentCatalog.ts with TanStack Query:
const { data: scraperData, isLoading: scrapersLoading } = useQuery({
  queryKey: ['admin', 'scrapers'],
  queryFn: () => adminApi.getScrapers(),
  refetchInterval: 60_000,
});

const syncMutation = useMutation({
  mutationFn: (id: string) => adminApi.syncScraper(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'scrapers'] }),
});

// Return:
parsers: scraperData?.data ?? [],
scrapersLoading,
triggerScraperSync: (id: string) => syncMutation.mutate(id),
```

---

### Sprint H Checklist

- [ ] `ScraperConfig` model added and migrated
- [ ] Seed script populates 3 initial scraper configs (Royal Road, MangaDex, Generic)
- [ ] `GET /api/v1/admin/scrapers` returns real parser configs with live stats
- [ ] `POST /api/v1/admin/scrapers/:id/sync` queues a re-crawl job
- [ ] Content page parser cards show real data (not mock)
- [ ] "Sync" button triggers real queue job
- [ ] Scraper `lastRunAt` updates in DB after a sync trigger

---

## Post-Sprint: God-Store Split (Concurrent with Sprint C–H)

The `adminStore.ts` god-store currently manages 6 unrelated domains in one file (~340 lines).
As each domain gets wired to TanStack Query in Sprints C–H, the corresponding state is
removed from `adminStore.ts`. What remains should be split into domain-scoped Zustand stores
for client-only state.

### What Stays in Zustand After API Wiring

| State | Belongs In | Reason |
|---|---|---|
| `theme` + `toggleTheme` | `useAdminUIStore` | Client-only — persisted to localStorage |
| `sidebarCollapsed` + `toggleSidebar` | `useAdminUIStore` | Client-only UI preference |
| `playgroundHistory` | `useLiberAdminStore` | Client-only session data |
| `categories` (content taxonomy) | `useAdminUIStore` or dedicated store | Until Sprint H wires scraper config |

### What Gets Removed as Sprints Complete

| Domain | Removed When | Replaced With |
|---|---|---|
| `users`, `toggleUserBan`, etc. | Sprint D | TanStack Query mutations |
| `featureFlags`, `toggleFeatureFlag`, etc. | Sprint E | TanStack Query mutations |
| `creators`, `moderatedStories`, etc. | Sprint F | TanStack Query mutations |
| `stats`, `activities` | Sprint G | TanStack Query queries |
| `liberAnalytics` | Sprint G | TanStack Query queries |
| `contentList` | Sprint C | TanStack Query query |
| `parsers`, `triggerScraperSync` | Sprint H | TanStack Query query + mutation |

After all sprints, `adminStore.ts` becomes `useAdminUIStore.ts` — a small, focused store
for theme and layout preferences. Every other concern lives in its feature hook.

---

## Tech Debt & Low-Priority Improvements (Post-Sprint H)

These items are tracked but not sprint-blocking.

| # | Issue | Fix |
|---|---|---|
| L1 | `sidebarCollapsed` resets on refresh | Add `persist` middleware to `useAdminUIStore` |
| L2 | No error boundaries | Add React error boundaries around each page |
| L3 | Activity stream timestamps are relative strings | Use real `createdAt` from DB + `date-fns` formatting |
| L4 | No loading skeletons on initial page loads | Add Tailwind skeleton pulse animations |
| L5 | `packages/ui` not used by admin | Migrate admin atoms to shared package after `packages/ui` stabilises |
| L6 | No TypeScript strict mode verified in admin | Run `pnpm --filter @arcanium/admin typecheck` and fix all errors |
| L7 | Pagination not implemented on user/content tables | Add `page` + `limit` to all list queries, add pagination UI |
| L8 | Token cost in Liber Analytics always shows 0 | Add `tokensUsed` + `costUsd` fields to `AiActionLog`, log from AI service |

---

## Complete Admin Functionality Checklist

### Sprint A — Foundation
- [ ] `User.status` enum + field migrated
- [ ] `CreatorApplication`, `ModeratedContent`, `FeatureFlag` models migrated
- [ ] `apps/admin/.env.example` created
- [ ] `@arcanium/api-client` + `@tanstack/react-query` installed in admin
- [ ] `main.tsx` wrapped with `QueryClientProvider`
- [ ] Build passes

### Sprint B — Auth Gate
- [ ] `useAdminAuthStore.ts` created
- [ ] `LoginPage.tsx` functional
- [ ] `<RequireAdminAuth>` guard in place
- [ ] `App.tsx` updated with login route
- [ ] Silent refresh restores session on page reload
- [ ] Port 3001 requires login

### Sprint C — Quick Wins
- [ ] Content table shows real DB catalogue
- [ ] Liber playground calls real AI endpoint
- [ ] No mock data used for either feature

### Sprint D — User Management
- [ ] 4 user endpoints live and role-gated
- [ ] Ban/suspend/role change persists in DB
- [ ] `useUserManagement.ts` uses TanStack Query

### Sprint E — Feature Flags
- [ ] ADR-0001 written
- [ ] 3 feature flag endpoints live
- [ ] Seed populates canonical flags
- [ ] `useFeatureFlags.ts` uses TanStack Query
- [ ] Toggles persist across page refresh

### Sprint F — Creators & Moderation
- [ ] 5 creator/moderation endpoints live
- [ ] Approve upgrades user role atomically
- [ ] `useCreatorVerification.ts` uses TanStack Query

### Sprint G — Dashboard + Liber Analytics
- [ ] 3 analytics/stats endpoints live
- [ ] Dashboard shows real user counts and reading activity
- [ ] Liber Analytics shows real mood aggregation and token history
- [ ] Both pages auto-refresh

### Sprint H — Scraper Management
- [ ] `ScraperConfig` model migrated and seeded
- [ ] 2 scraper endpoints live
- [ ] Content page parser cards show real data
- [ ] Sync button triggers real queue job

---

## Definition of Done for Admin Panel

The admin panel is "production functional" when:

1. Every page shows real data from the database — no mock data in any production build.
2. Every mutation (ban, role change, flag toggle, approve) persists after page refresh.
3. The panel is inaccessible without a valid ADMIN/MODERATOR JWT.
4. Every admin API endpoint returns 401 without auth and 403 for insufficient role.
5. The Liber playground calls the real AI and displays real tool call results.
6. The dashboard stats auto-refresh without manual page reload.

---

*Plan created: September 2026 — Arcanium Engineering Lead*
*Source: admin-app-audit.md, CONSTITUTION.md, full codebase review (apps/admin, apps/web, services/backend, packages/api-client)*
*Dependency order is strict: A → B → C → D/E/F (parallel) → G → H*
