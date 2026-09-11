# Local Development Setup

> **Purpose:** Get the full Arcanium monorepo running on your machine from scratch.
> **Time to complete:** ~20 minutes on a clean machine.
> **Constitution refs:** §3 (Monorepo Structure), §5 (Backend Rules), §6 (Environment Rules)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Monorepo Folder Structure](#2-monorepo-folder-structure)
3. [Root Configuration Files](#3-root-configuration-files)
4. [Package Manifests](#4-package-manifests)
5. [Environment Variables (.env.example)](#5-environment-variables-envexample)
6. [First-Time Setup Commands](#6-first-time-setup-commands)
7. [Running the Stack Locally](#7-running-the-stack-locally)
8. [Verifying Everything Works](#8-verifying-everything-works)

---

## 1. Prerequisites

Install these before anything else. Versions are the minimum tested.

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) or via `nvm` |
| pnpm | 9+ | `npm install -g pnpm` |
| Git | any | [git-scm.com](https://git-scm.com) |
| Docker Desktop | any | [docker.com](https://www.docker.com/products/docker-desktop) — for the local Postgres container |

> **Why pnpm?** Fastest install times for monorepos, correct workspace hoisting behaviour, and a single deterministic lockfile. See ADR-0001.

Pin your Node version by creating `.nvmrc` at the repo root:

```
22
```

Then run `nvm use` whenever you open the project (or configure your shell to do it automatically).

---

## 2. Monorepo Folder Structure

This is the **complete scaffolded layout** for the repository. Create every directory and file listed here before running any install commands.

```
arcanium/                              # Repository root
│
├── apps/
│   ├── marketing/                     # Astro — static SEO/marketing site
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   │   └── index.astro
│   │   │   └── content/
│   │   ├── public/
│   │   ├── astro.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                           # React + Vite — primary SPA
│       ├── src/
│       │   ├── features/
│       │   │   └── auth/
│       │   │       ├── components/
│       │   │       │   └── LoginButton.tsx
│       │   │       └── hooks/
│       │   │           └── useAuth.ts
│       │   ├── components/
│       │   │   └── Layout.tsx
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── api-client/                    # Typed fetch wrapper — used by apps, not services
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                            # Shared React components + Tailwind config
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── Button.tsx
│   │   │   ├── tokens.css             # CSS custom properties for design tokens
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts         # Canonical Tailwind config — extended by apps
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── types/                         # Shared Zod schemas + inferred TypeScript types
│   │   ├── src/
│   │   │   ├── user.ts
│   │   │   ├── content.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                        # Shared ESLint, Prettier, tsconfig base
│       ├── eslint/
│       │   └── base.js
│       ├── prettier/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── package.json
│
├── services/
│   └── backend/                       # Node.js + Express + Prisma — the API server
│       ├── prisma/
│       │   ├── schema.prisma          # Canonical schema (see database-schema.md)
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── src/
│       │   ├── index.ts               # Express app entry point
│       │   ├── middleware/
│       │   │   ├── authenticate.ts
│       │   │   ├── featureFlag.ts
│       │   │   └── rateLimiter.ts
│       │   ├── routes/
│       │   │   ├── auth.ts            # /api/v1/auth/*
│       │   │   ├── library.ts         # /api/v1/library/*
│       │   │   └── ai.ts              # /api/v1/ai/*
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   └── library.service.ts
│       │   ├── ai/                    # AI Housekeeper module
│       │   │   ├── router.ts
│       │   │   ├── housekeeper.service.ts
│       │   │   ├── executor.ts
│       │   │   ├── context.ts
│       │   │   ├── providers/
│       │   │   │   └── index.ts
│       │   │   ├── prompts/
│       │   │   │   └── system.ts
│       │   │   └── tools/
│       │   │       └── index.ts
│       │   └── lib/
│       │       └── prisma.ts          # Singleton Prisma client
│       ├── tsconfig.json
│       └── package.json
│
├── docs/                              # All project documentation
├── .env.example                       # Canonical environment variable manifest
├── .gitignore
├── .nvmrc                             # Node version pin: "22"
├── pnpm-workspace.yaml
├── package.json                       # Root: scripts, shared devDependencies
└── tsconfig.base.json                 # Root tsconfig extended by all packages
```

> **Critical layout rule from CONSTITUTION §3:** `apps/` and `services/` both depend on `packages/` — but `apps/` never imports from `services/`, and `packages/` never imports from either. All cross-tier communication goes through the HTTP API.

---
## 3. Root Configuration Files

These files live at the repository root and govern the entire workspace.

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### .gitignore

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.astro/
out/

# Environment
.env
.env.local
.env.*.local

# Prisma generated
services/backend/node_modules/.prisma/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Logs
*.log
npm-debug.log*
```

---
## 4. Package Manifests

Every `package.json` shown here is complete and ready to copy into place.

---

### Root `package.json`

```json
{
  "name": "arcanium",
  "version": "0.0.1",
  "private": true,
  "description": "Arcanium — The Living Archive monorepo",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "concurrently -n marketing,web,backend -c cyan,blue,green \"pnpm --filter @arcanium/marketing dev\" \"pnpm --filter @arcanium/web dev\" \"pnpm --filter @arcanium/backend dev\"",
    "build": "pnpm --filter @arcanium/types build && pnpm --filter @arcanium/api-client build && pnpm --filter @arcanium/ui build && pnpm --filter @arcanium/marketing build && pnpm --filter @arcanium/web build && pnpm --filter @arcanium/backend build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,astro,json,md,css}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,astro,json,md,css}\"",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "concurrently": "9.1.0",
    "prettier": "3.3.3",
    "typescript": "5.5.4"
  }
}
```

> **Build order matters.** The root `build` script compiles shared packages (`types`, `api-client`, `ui`) before the apps and services that depend on them. For development, `concurrently` runs everything in parallel — TypeScript watch mode in each package handles incremental recompilation.

---

### `apps/marketing/package.json`

```json
{
  "name": "@arcanium/marketing",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev --port 3001",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check",
    "lint": "eslint src --ext .astro,.ts"
  },
  "dependencies": {
    "@arcanium/types": "workspace:*",
    "@arcanium/ui": "workspace:*",
    "astro": "4.12.2"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "@astrojs/react": "3.6.2",
    "@astrojs/tailwind": "5.1.0",
    "tailwindcss": "3.4.7"
  }
}
```

---

### `apps/web/package.json`

```json
{
  "name": "@arcanium/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@arcanium/api-client": "workspace:*",
    "@arcanium/types": "workspace:*",
    "@arcanium/ui": "workspace:*",
    "@tanstack/react-query": "5.51.21",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "6.26.0",
    "zustand": "4.5.4"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@vitejs/plugin-react": "4.3.1",
    "tailwindcss": "3.4.7",
    "vite": "5.3.5"
  }
}
```

---

### `packages/types/package.json`

```json
{
  "name": "@arcanium/types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "typescript": "5.5.4"
  }
}
```

---

### `packages/api-client/package.json`

```json
{
  "name": "@arcanium/api-client",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@arcanium/types": "workspace:*"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "typescript": "5.5.4"
  }
}
```

---

### `packages/ui/package.json`

```json
{
  "name": "@arcanium/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./tailwind": "./tailwind.config.ts",
    "./tokens.css": "./src/tokens.css"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@arcanium/types": "workspace:*",
    "react": "18.3.1"
  },
  "peerDependencies": {
    "react": ">=18",
    "tailwindcss": ">=3"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "@types/react": "18.3.3",
    "tailwindcss": "3.4.7",
    "typescript": "5.5.4"
  }
}
```

---

### `packages/config/package.json`

```json
{
  "name": "@arcanium/config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./eslint/base": "./eslint/base.js",
    "./prettier": "./prettier/index.js",
    "./typescript/base": "./typescript/base.json"
  }
}
```

---

### `services/backend/package.json`

```json
{
  "name": "@arcanium/backend",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@arcanium/types": "workspace:*",
    "@prisma/client": "5.17.0",
    "express": "4.19.2",
    "google-auth-library": "9.13.0",
    "jsonwebtoken": "9.0.2",
    "zod": "3.23.8",
    "express-rate-limit": "7.4.0",
    "cookie-parser": "1.4.6",
    "cors": "2.8.5",
    "helmet": "7.1.0",
    "dotenv": "16.4.5"
  },
  "devDependencies": {
    "@arcanium/config": "workspace:*",
    "@types/cookie-parser": "1.4.7",
    "@types/cors": "2.8.17",
    "@types/express": "4.17.21",
    "@types/jsonwebtoken": "9.0.6",
    "@types/node": "22.4.0",
    "prisma": "5.17.0",
    "tsx": "4.17.0",
    "typescript": "5.5.4"
  }
}
```

> **`tsx watch`** is used for development because it runs TypeScript directly without a separate compile step. In production (`pnpm start`) the compiled `dist/index.js` runs. This keeps dev fast without sacrificing production correctness.

---
## 5. Environment Variables (.env.example)

Copy this file to `.env` at the repo root and fill in every value before running anything.
**Never commit `.env`.** Only `.env.example` is tracked by Git.

```bash
# =============================================================================
# ARCANIUM — Environment Variable Manifest
# Copy this file to .env and fill in all values.
# See docs/guides/environment-variables.md for detailed descriptions.
# =============================================================================

# -----------------------------------------------------------------------------
# DATABASE
# Prisma connection string. This is the ONLY database config in the codebase.
#
# Local dev:    postgresql://postgres:devpassword@localhost:5432/arcanium
# Supabase:     postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
# Docker:       postgresql://postgres:devpassword@postgres:5432/arcanium
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/arcanium"

# -----------------------------------------------------------------------------
# AUTHENTICATION
# JWT signing secret — use a long random string (32+ chars).
# Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# -----------------------------------------------------------------------------
JWT_SECRET=""
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_EXPIRES_IN="30d"

# -----------------------------------------------------------------------------
# GOOGLE OAUTH 2.0
# Create credentials at: https://console.cloud.google.com/apis/credentials
# Authorised redirect URI for local dev: http://localhost:4000/api/v1/auth/google/callback
# -----------------------------------------------------------------------------
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:4000/api/v1/auth/google/callback"

# -----------------------------------------------------------------------------
# AI HOUSEKEEPER
# Provider-agnostic AI config. Swap AI_PROVIDER to switch providers.
# Supported: openai | anthropic | ollama
# -----------------------------------------------------------------------------
FEATURE_FLAG_AI_HOUSEKEEPER="false"
AI_PROVIDER="openai"
AI_PROVIDER_API_KEY=""
AI_PROVIDER_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"

# -----------------------------------------------------------------------------
# BACKEND SERVER
# -----------------------------------------------------------------------------
PORT="4000"
NODE_ENV="development"
# Comma-separated list of allowed CORS origins
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# -----------------------------------------------------------------------------
# FRONTEND — VITE (apps/web)
# VITE_ prefix required for Vite to expose these to the browser bundle.
# Set to the backend URL as seen from the browser.
# -----------------------------------------------------------------------------
VITE_API_BASE_URL="http://localhost:4000"

# -----------------------------------------------------------------------------
# FRONTEND — ASTRO (apps/marketing)
# PUBLIC_ prefix required for Astro to expose these at build time.
# -----------------------------------------------------------------------------
PUBLIC_API_BASE_URL="http://localhost:4000"

# -----------------------------------------------------------------------------
# FEATURE FLAGS
# Set to "true" to enable. All features are off by default.
# -----------------------------------------------------------------------------
FEATURE_FLAG_COMMUNITY="false"
FEATURE_FLAG_EXPLORE_ENGINE="false"
FEATURE_FLAG_OFFLINE_SYNC="false"
```

---

## 6. First-Time Setup Commands

Run these **once** after cloning the repo, in order.

```bash
# 1. Verify you are on the correct Node version
node --version   # should print v22.x.x
# If using nvm:
nvm use

# 2. Install all workspace dependencies from the repo root
pnpm install

# 3. Start a local Postgres container (Docker required)
#    This creates a container named 'arcanium-dev-db' on port 5432.
#    Persists data in a named volume so it survives restarts.
docker run -d \
  --name arcanium-dev-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=arcanium \
  -p 5432:5432 \
  -v arcanium_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

# 4. Copy environment template and fill in values
#    At minimum: DATABASE_URL is pre-filled to match the container above.
#    Fill in JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
cp .env.example .env

# 5. Generate the Prisma client from the schema
pnpm --filter @arcanium/backend db:generate

# 6. Run the initial database migration
#    This creates all tables from prisma/schema.prisma.
pnpm --filter @arcanium/backend db:migrate

# 7. Seed the database with initial data (optional but recommended)
pnpm --filter @arcanium/backend db:seed
```

---

## 7. Running the Stack Locally

After first-time setup, a single command from the repo root starts everything:

```bash
pnpm dev
```

This runs three processes concurrently via the root `dev` script:

| Process | URL | Description |
|---|---|---|
| `@arcanium/backend` | `http://localhost:4000` | Express API server (tsx watch, hot-reload) |
| `@arcanium/web` | `http://localhost:3000` | Vite SPA (HMR enabled) |
| `@arcanium/marketing` | `http://localhost:3001` | Astro dev server |

**Running services individually** (useful when only working on one area):

```bash
# Backend only
pnpm --filter @arcanium/backend dev

# Web app only
pnpm --filter @arcanium/web dev

# Marketing only
pnpm --filter @arcanium/marketing dev
```

**Database tools:**

```bash
# Open Prisma Studio (visual DB browser) at http://localhost:5555
pnpm --filter @arcanium/backend db:studio

# Create a new migration after schema changes
pnpm --filter @arcanium/backend db:migrate

# Apply migrations in production / CI (no prompts)
pnpm --filter @arcanium/backend db:migrate:prod
```

---

## 8. Verifying Everything Works

After running `pnpm dev`, confirm each service is healthy:

**Backend:**
```bash
curl http://localhost:4000/api/v1/health
# Expected: { "data": { "status": "ok", "db": "connected" }, "error": null }
```

**Web app:** Open `http://localhost:3000` — you should see the React shell with a "Sign in with Google" button (or a dummy login in Sprint 1).

**Marketing:** Open `http://localhost:3001` — you should see the Astro landing page.

**Database:** Run `pnpm --filter @arcanium/backend db:studio` and verify the `User`, `Content`, `Shelf` etc. tables exist and are empty.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Cannot connect to database` | Check Docker is running: `docker ps`. Restart container: `docker start arcanium-dev-db` |
| `Port 5432 already in use` | Another Postgres is running locally. Stop it or change `DATABASE_URL` port to `5433` and restart the container with `-p 5433:5432` |
| `pnpm: command not found` | Run `npm install -g pnpm` then open a new terminal |
| `Module not found: @arcanium/types` | Run `pnpm --filter @arcanium/types build` to compile the package first |
| `EACCES permission denied` on port 3000/4000 | On Linux/Mac: ports below 1024 need sudo. Our ports are all above 1024 — check nothing else is using them: `lsof -i :3000` |
| Prisma client out of sync | Run `pnpm --filter @arcanium/backend db:generate` after any schema change |

---

*Last updated: September 2026 — Arcanium founding team.*