# Sprint 1 — Backend Foundation & Web Shell

> **Goal:** A running monorepo where a developer can sign in with Google, have a User record created in Postgres, and retrieve it via an authenticated API call. Nothing more, nothing less.
> **Duration:** 1 week
> **Definition of Done:** All five steps are checked off, the health endpoint is green, and `GET /api/v1/users/me` returns the authenticated user's profile.

---

## Pre-Sprint Checklist

Before writing any code, confirm:

- [ ] `docs/guides/local-setup.md` has been followed — Postgres container is running, `.env` is filled
- [ ] `pnpm install` has been run from the repo root with no errors
- [ ] `http://localhost:4000` is reachable (even with an empty `src/index.ts`)
- [ ] A Google OAuth app exists in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with the redirect URI set to `http://localhost:4000/api/v1/auth/google/callback`

---

## Step 1 — Initialize the Monorepo and Scaffold All Packages

**Objective:** Every workspace directory exists with its `package.json`, TypeScript is configured end-to-end, and `pnpm install` succeeds with no errors.

### 1.1 Create the directory tree

Run from the repo root:

```bash
# Apps
mkdir -p apps/marketing/src/pages apps/marketing/src/components apps/marketing/src/content apps/marketing/public
mkdir -p apps/web/src/features/auth/components apps/web/src/features/auth/hooks apps/web/src/components apps/web/public

# Packages
mkdir -p packages/types/src
mkdir -p packages/api-client/src
mkdir -p packages/ui/src/components
mkdir -p packages/config/eslint packages/config/prettier packages/config/typescript

# Services
mkdir -p services/backend/src/middleware services/backend/src/routes services/backend/src/services services/backend/src/lib services/backend/src/ai/tools services/backend/src/ai/providers services/backend/src/ai/prompts
mkdir -p services/backend/prisma/migrations

# Docs
mkdir -p docs/sprints docs/adrs
```

### 1.2 Create all package.json files

Copy every `package.json` from `docs/guides/local-setup.md` §4 into its correct directory. The exact contents are not repeated here — the setup guide is the source of truth.

```bash
# Verify after copying — every workspace must be discoverable
pnpm list -r --depth 0
```

Expected output — all seven packages listed:
```
@arcanium/backend
@arcanium/marketing
@arcanium/web
@arcanium/api-client
@arcanium/config
@arcanium/types
@arcanium/ui
```

### 1.3 Create the root TypeScript config

Create `tsconfig.base.json` at the repo root (content in `local-setup.md` §3).

Create `services/backend/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/types/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/api-client/tsconfig.json` — identical structure to `packages/types/tsconfig.json`.

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `apps/web/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["vite.config.ts"]
}
```

### 1.4 Create the shared config package stubs

`packages/config/prettier/index.js`:

```js
/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  plugins: ["prettier-plugin-tailwindcss"],
};
```

`packages/config/typescript/base.json` — copy `tsconfig.base.json` content from `local-setup.md` §3.

### 1.5 Install all dependencies

```bash
pnpm install
```

### 1.6 Verify TypeScript compiles

```bash
# Compile the types package first (others depend on it)
pnpm --filter @arcanium/types build

# Typecheck the backend
pnpm --filter @arcanium/backend typecheck
```

Both should complete with zero errors. If you see "Cannot find module" errors, confirm `pnpm install` ran successfully and the workspace protocol entries in `package.json` files are correct.

**✅ Step 1 complete when:** `pnpm list -r --depth 0` shows all 7 packages and `pnpm --filter @arcanium/backend typecheck` exits 0.

---
## Step 2 — Set Up Prisma with PostgreSQL and Run the Initial Migration

**Objective:** The Prisma schema from `docs/architecture/database-schema.md` is live in Postgres. All tables exist. The `db:seed` script creates a test user.

### 2.1 Copy the Prisma schema

Create `services/backend/prisma/schema.prisma` with the full schema from `docs/architecture/database-schema.md` §3. The schema is not duplicated here — the architecture doc is the single source of truth for the schema.

### 2.2 Create the Prisma client singleton

`services/backend/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma client instances in development (hot-reload creates new modules)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 2.3 Generate the Prisma client

```bash
pnpm --filter @arcanium/backend db:generate
```

This reads `schema.prisma` and writes the typed client into `node_modules/.prisma/client`.

### 2.4 Run the initial migration

```bash
pnpm --filter @arcanium/backend db:migrate
```

Prisma will prompt for a migration name. Use: `init_schema`

This creates `services/backend/prisma/migrations/[timestamp]_init_schema/migration.sql` and applies it to the local Postgres database.

**Verify the migration ran:**

```bash
pnpm --filter @arcanium/backend db:studio
```

Open `http://localhost:5555`. You should see all models in the left sidebar: `User`, `Content`, `Chapter`, `Shelf`, `ShelfEntry`, `ReadingProgress`, `AiMemory`, `AiMoodEntry`, `AiActionLog`.

### 2.5 Create the seed script

`services/backend/prisma/seed.ts`:

```typescript
import { PrismaClient, ContentType, ContentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test user (represents a Google-authenticated user)
  const user = await prisma.user.upsert({
    where: { email: 'dev@arcanium.local' },
    update: {},
    create: {
      googleId: 'google_dev_test_id_001',
      email: 'dev@arcanium.local',
      displayName: 'Dev User',
      avatarUrl: null,
    },
  });
  console.log(`Upserted user: ${user.email}`);

  // Create the five default system shelves for the test user
  const systemShelves = ['Reading', 'Completed', 'On Hold', 'Dropped', 'Plan to Read'];
  for (const [index, name] of systemShelves.entries()) {
    await prisma.shelf.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name, isDefault: true, sortOrder: index },
    });
  }
  console.log(`Created ${systemShelves.length} default shelves for dev user`);

  // Create a sample content entry
  await prisma.content.upsert({
    where: { slug: 'the-beginning-after-the-end' },
    update: {},
    create: {
      type: ContentType.WEB_NOVEL,
      status: ContentStatus.ONGOING,
      title: 'The Beginning After the End',
      slug: 'the-beginning-after-the-end',
      author: 'TurtleMe',
      synopsis: 'King Grey has unrivalled strength, wealth, and prestige in a world governed by martial ability.',
      sourceUrl: 'https://www.tapas.io/series/tbate',
      sourceSite: 'tapas',
      chapterCount: 400,
      metadata: {
        genres: ['Fantasy', 'Action', 'Reincarnation'],
        tags: ['Strong Lead', 'Magic', 'Kingdom Building'],
        isLicensed: true,
      },
    },
  });
  console.log('Upserted sample content entry');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add the seed entry to `services/backend/package.json` under `prisma`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

```bash
pnpm --filter @arcanium/backend db:seed
```

**✅ Step 2 complete when:** Prisma Studio shows all tables with the seeded `User`, `Shelf` rows, and one `Content` row.

---
## Step 3 — Implement Google Auth in the Backend

**Objective:** `GET /api/v1/auth/google` redirects to Google. Google redirects back to `/api/v1/auth/google/callback`. The backend validates the token, upserts the user in Postgres, and sets a `httpOnly` refresh token cookie while returning a short-lived JWT access token.

### 3.1 Create the Express entry point

`services/backend/src/index.ts`:

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT ?? 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') ?? [],
  credentials: true,            // required for httpOnly cookie exchange
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRouter);

// Health check — used by Docker, Render, and local verification
app.get('/api/v1/health', async (_req, res) => {
  try {
    await import('./lib/prisma').then(({ prisma }) => prisma.$queryRaw`SELECT 1`);
    res.json({ data: { status: 'ok', db: 'connected' }, error: null });
  } catch {
    res.status(503).json({ data: null, error: { code: 'DB_UNAVAILABLE', message: 'Database unreachable' } });
  }
});

app.listen(PORT, () => {
  console.log(`Arcanium backend running on http://localhost:${PORT}`);
});
```

### 3.2 Create the auth router

`services/backend/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { googleRedirect, googleCallback, refreshToken, logout } from '../services/auth.service';

export const authRouter = Router();

// Step 1: redirect user to Google consent screen
authRouter.get('/google', googleRedirect);

// Step 2: Google redirects back here with ?code=
authRouter.get('/google/callback', googleCallback);

// Silently refresh the access token using the httpOnly refresh cookie
authRouter.post('/refresh', refreshToken);

// Clear the refresh token cookie
authRouter.post('/logout', logout);
```

### 3.3 Create the auth service

`services/backend/src/services/auth.service.ts`:

```typescript
import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// ── Helpers ────────────────────────────────────────────────────────────────

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ?? '15m',
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ?? '30d',
  });
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('arcanium_refresh', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days in ms
    path: '/api/v1/auth',                 // scoped to auth routes only
  });
}

// ── Handlers ───────────────────────────────────────────────────────────────

export function googleRedirect(_req: Request, res: Response): void {
  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
  });
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const { code } = req.query as { code?: string };

  if (!code) {
    res.status(400).json({ data: null, error: { code: 'MISSING_CODE', message: 'No auth code received' } });
    return;
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    // Verify the ID token and extract user info
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      res.status(401).json({ data: null, error: { code: 'INVALID_TOKEN', message: 'Invalid Google token' } });
      return;
    }

    // Upsert user in Postgres — this is the ONLY place a User row is created
    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email,
        displayName: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        displayName: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      },
    });

    // Create default shelves for new users (idempotent)
    const defaultShelves = ['Reading', 'Completed', 'On Hold', 'Dropped', 'Plan to Read'];
    await Promise.all(
      defaultShelves.map((name, index) =>
        prisma.shelf.upsert({
          where: { userId_name: { userId: user.id, name } },
          update: {},
          create: { userId: user.id, name, isDefault: true, sortOrder: index },
        }),
      ),
    );

    // Issue tokens
    const accessToken = signAccessToken(user.id);
    const refreshTkn = signRefreshToken(user.id);
    setRefreshCookie(res, refreshTkn);

    // Redirect to the web app with the access token in the URL fragment
    // The SPA reads it once, stores it in memory, and discards it from the URL.
    const webAppUrl = process.env.CORS_ORIGINS?.split(',')[0] ?? 'http://localhost:3000';
    res.redirect(`${webAppUrl}/auth/callback#token=${accessToken}`);

  } catch (err) {
    console.error('[auth] Google callback error:', err);
    res.status(500).json({ data: null, error: { code: 'AUTH_FAILED', message: 'Authentication failed' } });
  }
}

export function refreshToken(req: Request, res: Response): void {
  const token = req.cookies['arcanium_refresh'] as string | undefined;
  if (!token) {
    res.status(401).json({ data: null, error: { code: 'NO_REFRESH_TOKEN', message: 'Not authenticated' } });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    if (payload.type !== 'refresh' || !payload.sub) throw new Error('Invalid token type');
    const accessToken = signAccessToken(payload.sub);
    res.json({ data: { accessToken }, error: null });
  } catch {
    res.status(401).json({ data: null, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' } });
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('arcanium_refresh', { path: '/api/v1/auth' });
  res.json({ data: { message: 'Logged out' }, error: null });
}
```

### 3.4 Create the authenticate middleware

`services/backend/src/middleware/authenticate.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user: { id: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    if (!payload.sub) throw new Error('Missing sub');
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ data: null, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}
```

### 3.5 Start the backend and test the auth flow

```bash
pnpm --filter @arcanium/backend dev
```

1. Open `http://localhost:4000/api/v1/auth/google` in a browser.
2. Complete the Google sign-in flow.
3. You should be redirected to `http://localhost:3000/auth/callback#token=<JWT>`.
4. Copy the JWT and verify it in [jwt.io](https://jwt.io) — the `sub` claim should be your Arcanium User `id` (a cuid).
5. Check Prisma Studio — a `User` row and 5 `Shelf` rows should now exist.

**✅ Step 3 complete when:** Completing the Google OAuth flow creates a `User` row in Postgres and redirects with a valid JWT.

---
## Step 4 — Build the Vite + React Web Shell

**Objective:** A running SPA with a root layout, React Router configured, a Google Sign-In button that initiates the OAuth flow, and an `/auth/callback` route that captures the JWT from the URL fragment and stores it in memory.

### 4.1 Create the Vite config

`apps/web/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```

### 4.2 Create the HTML entry point

`apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Arcanium</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 4.3 Create the React entry point

`apps/web/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes
      retry: 1,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

### 4.4 Create the auth store (Zustand)

`apps/web/src/features/auth/store/useAuthStore.ts`:

```typescript
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => set({ accessToken: null }),

  // Convenience getter — components use this instead of checking token directly
  isAuthenticated: () => get().accessToken !== null,
}));
```

> **Why in-memory?** The Constitution §9.1 forbids storing JWTs in `localStorage` (XSS vulnerability). The access token lives in Zustand state — it clears on page reload. The `httpOnly` refresh cookie is sent automatically on requests to `/api/v1/auth/refresh`, so the user is silently re-authenticated on each app load.

### 4.5 Create the OAuth callback route

`apps/web/src/features/auth/components/AuthCallback.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export function AuthCallback() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    // The backend redirects here with #token=<JWT> in the URL fragment.
    // The fragment is never sent to the server — it stays client-side only.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('token');

    if (token) {
      setAccessToken(token);
      // Remove the token from the URL immediately so it doesn't sit in history
      window.history.replaceState(null, '', '/');
    }

    navigate('/', { replace: true });
  }, [navigate, setAccessToken]);

  return <p>Signing you in...</p>;
}
```

### 4.6 Create the Login page

`apps/web/src/features/auth/components/LoginPage.tsx`:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function LoginPage() {
  const handleGoogleSignIn = () => {
    // Full page redirect — the backend handles the OAuth flow
    window.location.href = `${API_BASE}/api/v1/auth/google`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">Arcanium</h1>
      <p className="mb-10 text-gray-400">The Living Archive</p>
      <button
        onClick={handleGoogleSignIn}
        className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 text-sm font-medium transition hover:bg-gray-800"
      >
        <img src="/google-icon.svg" alt="" width={20} height={20} />
        Continue with Google
      </button>
    </main>
  );
}
```

### 4.7 Create the root layout

`apps/web/src/components/Layout.tsx`:

```typescript
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';

export function Layout() {
  const { isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-lg font-bold">Arcanium</Link>
          {isAuthenticated() && (
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">
              Sign out
            </button>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

### 4.8 Wire everything together in App.tsx

`apps/web/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { AuthCallback } from './features/auth/components/AuthCallback';
import { LoginPage } from './features/auth/components/LoginPage';
import { useAuthStore } from './features/auth/store/useAuthStore';

// Lazy-load every authenticated route — each is a separate JS chunk
const HomePage = lazy(() => import('./features/home/components/HomePage').then(m => ({ default: m.HomePage })));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
```

### 4.9 Create the HomePage stub

`apps/web/src/features/home/components/HomePage.tsx`:

```typescript
export function HomePage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold">Your Library</h2>
      <p className="mt-2 text-gray-400">Nothing here yet. Start exploring to add titles.</p>
    </div>
  );
}
```

### 4.10 Add basic Tailwind setup

`apps/web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/web/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

### 4.11 Verify the web shell

```bash
pnpm --filter @arcanium/web dev
```

1. Open `http://localhost:3000` — you should see the dark login page with "Continue with Google".
2. Clicking the button should redirect to `http://localhost:4000/api/v1/auth/google` (the backend must also be running).
3. Completing the OAuth flow should return you to `http://localhost:3000` showing the homepage layout with "Your Library".

**✅ Step 4 complete when:** The Google Sign-In flow completes end-to-end and the user lands on the authenticated homepage.

---
## Step 5 -- User Profile Endpoint and End-to-End Read/Write Test

**Objective:** A protected `GET /api/v1/users/me` endpoint that reads the authenticated user's profile and default shelves from Postgres. The frontend calls it with the JWT and displays the user's name. This proves the full stack -- Google to JWT to Prisma to API to React -- is working.

### 5.1 Create the users router

`services/backend/src/routes/users.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getMe } from '../services/users.service';

export const usersRouter = Router();
usersRouter.get('/me', authenticate, getMe);
```

### 5.2 Create the users service

`services/backend/src/services/users.service.ts`:

```typescript
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, displayName: true, avatarUrl: true, createdAt: true,
      shelves: {
        where: { isDefault: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, sortOrder: true },
      },
    },
  });
  if (!user) {
    res.status(404).json({ data: null, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return;
  }
  res.json({ data: user, error: null });
}
```

### 5.3 Register the router in index.ts

Add these two lines to `services/backend/src/index.ts` (after the auth router):

```typescript
import { usersRouter } from './routes/users';
app.use('/api/v1/users', usersRouter);
```

### 5.4 Create the api-client foundation

`packages/api-client/src/index.ts`:

```typescript
type ApiResponse<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } };

class ApiClient {
  private baseUrl: string;
  private getToken: (() => string | null) | null = null;

  constructor(baseUrl: string) { this.baseUrl = baseUrl; }

  // Wire in the auth store's token getter at app startup
  setTokenGetter(fn: () => string | null) { this.getToken = fn; }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken?.();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    };
    const response = await fetch(this.baseUrl + path, {
      ...options, credentials: 'include', headers
    });
    return response.json() as Promise<ApiResponse<T>>;
  }

  get<T>(path: string) { return this.request<T>(path, { method: 'GET' }); }
  post<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  patch<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

// VITE_API_BASE_URL is replaced at build time by Vite
const baseUrl = typeof import.meta !== 'undefined'
  ? (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:4000'
  : 'http://localhost:4000';

export const apiClient = new ApiClient(baseUrl);
```

### 5.5 Create the useCurrentUser hook

`apps/web/src/features/auth/hooks/useCurrentUser.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@arcanium/api-client';
import { useAuthStore } from '../store/useAuthStore';

// Wire the token getter once at the hook boundary.
// Keeps api-client free of any React/Zustand dependency.
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

interface UserProfile {
  id: string; email: string; displayName: string; avatarUrl: string | null; createdAt: string;
  shelves: Array<{ id: string; name: string; sortOrder: number }>;
}

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<UserProfile>('/api/v1/users/me');
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
  });
}
```

### 5.6 Display user data in the HomePage

Update `apps/web/src/features/home/components/HomePage.tsx`:

```typescript
import { useCurrentUser } from '../../auth/hooks/useCurrentUser';

export function HomePage() {
  const { data: user, isLoading, error } = useCurrentUser();
  if (isLoading) return <p className='text-gray-400'>Loading your library...</p>;
  if (error) return <p className='text-red-400'>Failed to load profile. Try refreshing.</p>;
  return (
    <div>
      <h2 className='text-2xl font-semibold'>Welcome back, {user?.displayName ?? 'Reader'}</h2>
      <p className='mt-1 text-gray-400'>{user?.email}</p>
      <h3 className='mt-8 text-lg font-medium'>Your Shelves</h3>
      <ul className='mt-3 flex flex-col gap-2'>
        {user?.shelves.map((shelf) => (
          <li key={shelf.id} className='rounded-lg border border-gray-800 px-4 py-3 text-sm'>
            {shelf.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5.7 Start the full stack and verify

Run `pnpm dev` from the repo root (starts backend on 4000, web on 3000, marketing on 3001).

**Manual verification checklist:**

- [ ] `curl http://localhost:4000/api/v1/health` returns `{ data: { status: 'ok', db: 'connected' } }`  
- [ ] Visiting `http://localhost:3000` without being signed in redirects to `/login`  
- [ ] Completing the Google sign-in flow lands you on the homepage  
- [ ] The homepage shows your Google display name, email, and 5 default shelves  
- [ ] `curl -H 'Authorization: Bearer <JWT>' http://localhost:4000/api/v1/users/me` returns your profile JSON  
- [ ] Calling the endpoint with no token returns `{ error: { code: 'UNAUTHORIZED' } }`  
- [ ] Prisma Studio shows your `User` row and 5 `Shelf` rows  

**✅ Step 5 complete when:** All seven checklist items above are ticked.

---

## Sprint 1 -- Complete

All five steps done means you have:

| Capability | Status |
|---|---|
| Monorepo with 7 packages building cleanly | done |
| PostgreSQL schema live with all 9 models | done |
| Google OAuth flow issuing JWTs | done |
| httpOnly refresh cookie set | done |
| React SPA with protected routing | done |
| JWT stored in memory, not localStorage | done |
| GET /api/v1/users/me returning from Postgres | done |
| Frontend consuming the API via @arcanium/api-client | done |
| All DB access through Prisma -- no raw SQL | done |

---

## What Sprint 2 Builds On

With this foundation in place, Sprint 2 can progress in multiple parallel tracks:

- **Library routes** -- `GET /api/v1/library`, `POST /api/v1/library/shelves`, `PATCH /api/v1/library/progress/:contentId`  
- **Explore Engine stub** -- basic content search backed by the `Content` + `Chapter` tables  
- **AI Housekeeper bootstrap** -- wire up `POST /api/v1/ai/chat` with the `search_content` tool  
- **Astro marketing shell** -- hero section, waitlist form, deploy to Netlify  

---

*Last updated: September 2026 -- Arcanium founding team.*
