# Monorepo Structure and Deployment Architecture

> **Scope:** This document explains how the Arcanium monorepo is laid out, why each part lives where it does, and how the entire system transitions from Phase 1 managed cloud hosting to Phase 2 self-hosted Docker on a KVM VPS — without touching a single line of application code.

---

## Table of Contents

1. [Monorepo Overview](#1-monorepo-overview)
2. [Why a Monorepo](#2-why-a-monorepo)
3. [Workspace Dependency Graph](#3-workspace-dependency-graph)
4. [Frontend Coexistence: Astro and Vite](#4-frontend-coexistence-astro-and-vite)
5. [The 12-Factor Deployment Contract](#5-the-12-factor-deployment-contract)
6. [Phase 1: Managed Cloud Deployment](#6-phase-1-managed-cloud-deployment)
7. [Phase 2: Dockerized KVM VPS Deployment](#7-phase-2-dockerized-kvm-vps-deployment)
8. [Migration Path: Phase 1 to Phase 2](#8-migration-path-phase-1-to-phase-2)
9. [Local Development Setup](#9-local-development-setup)

---

## 1. Monorepo Overview

```
arcanium/                          # Monorepo root
├── apps/
│   ├── marketing/                 # Astro — static SEO/landing site
│   └── web/                       # React + Vite — primary SPA
├── packages/
│   ├── api-client/                # Typed fetch wrapper (shared across apps)
│   ├── ui/                        # Shared React component library
│   ├── types/                     # Zod schemas + inferred TypeScript types
│   └── config/                    # Shared ESLint, Prettier, tsconfig bases
├── services/
│   └── backend/                   # Node.js + Express + Prisma API server
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
├── docs/                          # All project documentation (you are here)
├── .env.example                   # Canonical environment variable manifest
├── CONSTITUTION.md                # Engineering rules and philosophy
├── docker-compose.yml             # Phase 2: local + production orchestration
├── pnpm-workspace.yaml
└── package.json                   # Root scripts and shared dev dependencies
```

**Key design rule:** The three tiers (pps/, packages/, services/) form a strict one-way dependency chain:

`
apps/ ──depends on──> packages/ <──depends on── services/
`

No package in packages/ may import from pps/ or services/. No app may import from services/ directly. All cross-tier communication goes through the typed HTTP API.

---

## 2. Why a Monorepo

| Benefit | How It Applies to Arcanium |
|---|---|
| **Single source of truth for types** | packages/types holds Zod schemas used by both the backend (validation) and frontend (parsing). A schema change is a single PR. |
| **Atomic cross-cutting changes** | An API endpoint change, the matching type update, and the frontend client update ship in one commit. |
| **Shared tooling** | ESLint, Prettier, and TypeScript configs are defined once in packages/config and extended everywhere. |
| **Independent deployability** | Despite living in one repo, each app and service deploys independently. The monorepo is a development convenience, not a deployment constraint. |

We use pnpm workspaces because it is the fastest package manager for monorepos, has first-class workspace protocol support (workspace:*), and produces a deterministic lockfile without hoisting surprises.

---

## 3. Workspace Dependency Graph

```
apps/marketing
  └── @arcanium/ui (Astro islands only, optional)
  └── @arcanium/types (for any build-time type checking)

apps/web
  └── @arcanium/api-client
  └── @arcanium/ui
  └── @arcanium/types

packages/api-client
  └── @arcanium/types

packages/ui
  └── @arcanium/types (for prop types)

services/backend
  └── @arcanium/types (Zod schemas for request validation)
  └── prisma (local, not a workspace package)
```

No circular dependencies are permitted. pnpm will detect and error on them.

---

## 4. Frontend Coexistence: Astro and Vite

Having two different frontend frameworks in one monorepo is a deliberate decision, not an accident. Here is why they coexist and how they are kept separate.

### Why Two Frontends?

| | pps/marketing (Astro) | pps/web (React + Vite) |
|---|---|---|
| **Primary goal** | Acquire users — SEO, performance, first impression | Retain users — feature richness, offline capability, speed |
| **JavaScript default** | Zero. HTML and CSS only unless explicitly added. | Full SPA. JS is the foundation. |
| **Rendering model** | Static Site Generation (SSG) at build time | Client-Side Rendering (CSR) at runtime |
| **Deployment target** | CDN edge (Netlify/Vercel static or Nginx static container) | CDN edge or Nginx container serving index.html with SPA fallback |
| **Auth** | No authentication. Public-only pages. | Full authenticated user session. |

### How They Stay Separate

- They have completely independent package.json files, build configs, and build outputs.
- Running pnpm --filter @arcanium/marketing build builds only the marketing site.
- They share code through packages/ only — never by importing each other's internal modules.
- The Vite dev server for pps/web and the Astro dev server for pps/marketing run on different ports and are completely independent processes.

### Shared Component Strategy

- packages/ui exports React components.
- pps/marketing can use these as Astro React islands (with client:load) for interactive elements.
- For purely presentational, static Astro components (e.g., a hero section), Astro's own .astro component format is preferred — no React overhead.
- The design tokens (colors, typography, spacing) are defined as CSS custom properties in a shared CSS file within packages/ui/src/tokens.css, importable by both Astro and Vite.

---
## 5. The 12-Factor Deployment Contract

The single most important architectural constraint is that the codebase must not encode any knowledge of its deployment environment.

This is enforced through three mechanisms:

### 5.1 — Environment Variables Are the Only Config

Every value that differs between environments (dev, staging, prod, Docker) is an environment variable. This includes:

- `DATABASE_URL` — the full Postgres connection string
- `JWT_SECRET` — signing key for tokens
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `AI_PROVIDER_API_KEY` / `AI_PROVIDER_BASE_URL` — AI service endpoint
- `VITE_API_BASE_URL` — backend URL injected at Vite build time
- `PUBLIC_API_BASE_URL` — backend URL for Astro build time

The `.env.example` file at the root is the canonical manifest of all variables. It is always kept up to date.

### 5.2 — No BaaS SDKs

The application never imports a BaaS client SDK. Supabase is permitted as a managed Postgres host — its connection string ends up in `DATABASE_URL` and Prisma handles everything else. Switching from Supabase Postgres to any other Postgres provider (Amazon RDS, a self-hosted container, Neon, Railway) is a one-line environment variable change.

### 5.3 — Stateless Services

The backend is stateless. No in-memory session state survives a process restart. All persistent state lives in Postgres. This means any number of backend instances can run behind a load balancer without sticky sessions.

---

## 6. Phase 1: Managed Cloud Deployment

Phase 1 is optimized for speed of iteration. Zero infrastructure to manage; focus entirely on product.

### Architecture Diagram

`````nBrowser
  |
  |-- GET arcanium.app (marketing)  --> [Netlify/Vercel CDN] --> apps/marketing (Astro static)
  |-- GET app.arcanium.app (web app) --> [Netlify/Vercel CDN] --> apps/web (Vite SPA static)
  |-- POST api.arcanium.app/api/v1/  --> [Render Web Service] --> services/backend (Node.js)
                                                                         |
                                                                   [Supabase Postgres]
                                                              (used as Postgres host only)
`````n
### Deployment Steps for Phase 1

**apps/marketing (Netlify)**

1. Connect the monorepo to Netlify.
2. Set base directory to `apps/marketing`.
3. Set build command to `pnpm build`.
4. Set publish directory to `dist`.
5. Set `PUBLIC_API_BASE_URL` in Netlify environment variables.

**apps/web (Netlify/Vercel)**

1. Connect the monorepo.
2. Set base directory to `apps/web`.
3. Set build command to `pnpm build`.
4. Set publish directory to `dist`.
5. Add a redirect rule: all paths -> `/index.html` (200 rewrite for SPA routing).
6. Set `VITE_API_BASE_URL` to the Render backend URL.

**services/backend (Render)**

1. Create a new Render Web Service pointing to `services/backend`.
2. Set build command to `pnpm install --frozen-lockfile && pnpm build`.
3. Set start command to `node dist/index.js`.
4. Set all required environment variables (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.) in Render's environment config.

---

## 7. Phase 2: Dockerized KVM VPS Deployment

Phase 2 takes everything that works in Phase 1 and puts it inside Docker containers on a KVM VPS. The application code does not change — only the environment and the infrastructure manifest change.

### Architecture Diagram

`````nInternet
  |
  v
[Nginx Reverse Proxy Container] (port 80/443, TLS via Let's Encrypt)
  |-- arcanium.app            --> [marketing-container]  (Nginx static, Astro build output)
  |-- app.arcanium.app        --> [web-container]        (Nginx static, Vite build output + SPA rewrite)
  |-- api.arcanium.app        --> [backend-container]    (Node.js, port 3000)
                                         |
                                  [postgres-container]   (Postgres 16, persistent volume)
`````n
### Dockerfiles

Each service has its own `Dockerfile`. Below are the canonical patterns.

**services/backend/Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY services/backend/ ./services/backend/
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @arcanium/backend build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/services/backend/dist ./dist
COPY --from=builder /app/services/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD [`node`, `dist/index.js`]
`````n
**apps/web/Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=\
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @arcanium/web build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
`````n
**apps/web/nginx.conf** (SPA fallback rule)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \ \/ /index.html;
    }
}
`````n
### docker-compose.yml (root)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: \
      POSTGRES_PASSWORD: \
      POSTGRES_DB: \
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [`CMD`, `pg_isready`, "-U", "\"]
      interval: 10s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: services/backend/Dockerfile
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - '3000:3000'

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_BASE_URL: \
    ports:
      - '4000:80'

  marketing:
    build:
      context: .
      dockerfile: apps/marketing/Dockerfile
      args:
        PUBLIC_API_BASE_URL: \
    ports:
      - '4001:80'

volumes:
  postgres_data:
`````n
---

## 8. Migration Path: Phase 1 to Phase 2

The transition is a pure infrastructure operation. No application code changes. Here is the exact sequence:

### Pre-Migration Checklist

- [ ] All environment variables documented in `.env.example` are accounted for in the new VPS environment.
- [ ] The production Postgres database has been migrated (pg_dump / pg_restore or a replication slot).
- [ ] DNS TTLs have been lowered to 60 seconds at least 48 hours before cutover.
- [ ] Docker and Docker Compose are installed on the KVM VPS.
- [ ] An Nginx reverse proxy (or Traefik) is configured for TLS termination.

### Migration Steps

1. **Clone the repository** on the VPS.
2. **Create `.env`** from `.env.example`, populating with production values. The most critical change: `DATABASE_URL` now points to the local Postgres container (`postgresql://user:pass@postgres:5432/arcanium`).
3. **Set `VITE_API_BASE_URL`** to the production API domain (e.g., `https://api.arcanium.app`). This is a build-time variable baked into the Vite static bundle.
4. **Run `docker compose build`** to build all images.
5. **Run `docker compose up -d`** to start all containers.
6. **Run database migrations:** `docker compose exec backend npx prisma migrate deploy`.
7. **Verify** all services are healthy via `docker compose ps`.
8. **Update DNS** records to point to the VPS IP.
9. **Monitor** logs: `docker compose logs -f`.
10. **Decommission** Phase 1 services (Render, Netlify) once traffic is confirmed stable.

### What Does NOT Change

- Zero lines of application code.
- Zero Prisma schema changes.
- Zero API contract changes.
- Zero frontend code changes.

This is the proof that the 12-Factor Contract (Section 5) is working correctly.

---

## 9. Local Development Setup

For local development we do **not** use Docker for the application services (too slow for hot-reload). Each service runs natively. Docker is only used to spin up a local Postgres instance.

```text
# Step 1 — Install all workspace dependencies from the repo root
pnpm install

# Step 2 — Copy environment template and fill in local values
copy .env.example .env

# Step 3 — Start Postgres for local dev (using Docker for the DB only)
# See docs/guides/local-setup.md for the exact compose snippet

# Step 4 — Push schema and seed the database
pnpm --filter @arcanium/backend prisma migrate dev
pnpm --filter @arcanium/backend prisma db seed

# Step 5 — Start all services concurrently
pnpm dev
# marketing -> http://localhost:3001
# web      -> http://localhost:3000
# backend  -> http://localhost:4000
`````n
The root `package.json` `dev` script uses `concurrently` to run all workspaces in parallel.

For a more detailed walkthrough, see [guides/local-setup.md](../guides/local-setup.md).

---

*Last updated: September 2026 — Arcanium founding team.*
