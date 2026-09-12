# Deploying the Arcanium Backend to Render

This guide walks through hosting `services/backend` as a **Web Service** on [Render](https://render.com).
The backend is an Express + Prisma app compiled to CommonJS. It needs PostgreSQL and optionally Redis.

---

## Prerequisites

- A Render account (free tier works for initial deploys)
- Your repo pushed to GitHub or GitLab (Render pulls from Git)
- A PostgreSQL database (Render Postgres, Supabase, Neon, etc.)
- *(Optional)* A Redis instance for the background scraper queue (Render Redis, Upstash, etc.)

---

## 1. Create the Web Service

1. In the Render dashboard, click **New → Web Service**
2. Connect your GitHub/GitLab repo
3. Set the **Root Directory** to the repo root (leave blank — Render needs the full monorepo to build)
4. Fill in the service settings:

| Setting | Value |
|---|---|
| **Name** | `arcanium-backend` (or whatever you like) |
| **Region** | Closest to your users |
| **Branch** | `main` (or your production branch) |
| **Runtime** | `Node` |
| **Build Command** | `npx pnpm@11.21.0 install --frozen-lockfile && npx pnpm@11.21.0 --filter @arcanium/types build && npx pnpm@11.21.0 --filter @arcanium/backend build` |
| **Start Command** | `node services/backend/dist/index.js` |
| **Instance Type** | Starter ($7/mo) minimum — free tier sleeps after 15 min inactivity |

> **Why build from root?** The backend imports `@arcanium/types` from `packages/types` via a pnpm workspace path. Render must install the full workspace for that resolution to work.

---

## 2. Database Migration

Prisma migrations must run **before** the app starts on each deploy.

Change the **Start Command** to run migrations first:

```
node services/backend/node_modules/.bin/prisma migrate deploy --schema=services/backend/prisma/schema.prisma && node services/backend/dist/index.js
```

Or create a `render.yaml` (see section 6) and use a pre-deploy command there.

> `migrate deploy` applies pending migrations without resetting data. Never use `migrate dev` or `migrate reset` in production.

---

## 3. Environment Variables

Go to **Environment → Environment Variables** in the Render service dashboard and add each of the following.

### Required

| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL connection string — use the **pooled** URL (port 6543 for Supabase, standard 5432 for others) |
| `DIRECT_URL` | Non-pooled connection string — required by Prisma for migrations (same host, port 5432) |
| `JWT_SECRET` | Long random secret. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CORS_ORIGINS` | Comma-separated list of your frontend URLs, e.g. `https://arcanium.app,https://admin.arcanium.app` |

### Optional but Recommended

| Variable | Description |
|---|---|
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Default `15m` |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Default `30d` |
| `PORT` | Render sets this automatically — **do not override** |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Must match your Render URL: `https://<service>.onrender.com/api/v1/auth/google/callback` |
| `REDIS_URL` | Redis connection string — enables background chapter queue. Without it the scraper falls back to sync fetching (graceful degradation). |

### AI Housekeeper (feature-flagged, off by default)

| Variable | Value |
|---|---|
| `FEATURE_FLAG_AI_HOUSEKEEPER` | `true` to enable |
| `AI_PROVIDER_API_KEY` | Your OpenRouter (or OpenAI-compatible) key |
| `AI_PROVIDER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `AI_MODEL` | e.g. `anthropic/claude-3.5-haiku` |
| `AI_SITE_URL` | Your deployed frontend URL |
| `AI_APP_NAME` | `Arcanium` |

---

## 4. Health Check

Render can auto-restart unhealthy instances. Configure it:

- **Health Check Path**: `/api/v1/health`
- **Expected Status**: `200`

The health endpoint queries `SELECT 1` against the DB and returns `503` if unreachable, so Render will catch database connectivity failures automatically.

---

## 5. Google OAuth Redirect URI

After your service is deployed, update your Google Cloud Console credentials:

1. Go to **APIs & Services → Credentials → your OAuth 2.0 Client**
2. Add to **Authorised redirect URIs**:
   ```
   https://<your-service>.onrender.com/api/v1/auth/google/callback
   ```
3. Update `GOOGLE_REDIRECT_URI` in Render's environment variables to match

---

## 6. Infrastructure as Code (`render.yaml`)

For repeatable, version-controlled deployments, add this file to the **repo root**:

```yaml
# render.yaml
services:
  - type: web
    name: arcanium-backend
    runtime: node
    region: oregon
    plan: starter
    rootDir: .
    buildCommand: npx pnpm@11.21.0 install --frozen-lockfile && npx pnpm@11.21.0 --filter @arcanium/backend build
    startCommand: node services/backend/dist/index.js
    healthCheckPath: /api/v1/health
    preDeployCommand: node services/backend/node_modules/.bin/prisma migrate deploy --schema=services/backend/prisma/schema.prisma
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false          # fill in the dashboard — never hardcode secrets
      - key: DIRECT_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true  # Render generates a random value on first deploy
      - key: CORS_ORIGINS
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_REDIRECT_URI
        sync: false
      - key: REDIS_URL
        sync: false
```

> `sync: false` means Render prompts you for the value in the dashboard rather than hardcoding it in the YAML.

---

## 7. First Deploy Checklist

- [ ] Repo is pushed to GitHub/GitLab
- [ ] `DATABASE_URL` and `DIRECT_URL` are set in Render env vars
- [ ] `JWT_SECRET` is set (long random string, not the example value)
- [ ] `CORS_ORIGINS` includes your frontend and admin URLs
- [ ] Build command runs from repo root (not `services/backend`)
- [ ] `migrate deploy` runs before the server starts
- [ ] Health check path set to `/api/v1/health`
- [ ] Google OAuth redirect URI updated in GCP console

---

## 8. Connecting Your Frontends

Once deployed, update the environment variables in your other apps:

**`apps/web/.env` (and Render/Vercel/Netlify env for web)**
```
VITE_API_BASE_URL=https://<your-service>.onrender.com
```

**`apps/admin/.env`**
```
VITE_API_BASE_URL=https://<your-service>.onrender.com
```

**`apps/marketing/.env`**
```
PUBLIC_API_BASE_URL=https://<your-service>.onrender.com
```

---

## 9. Troubleshooting

**Build fails with "Cannot find module '@arcanium/types'"**  
The build command must run from the repo root so pnpm can resolve workspace packages. Make sure **Root Directory** in Render is empty (repo root), not `services/backend`.

**Server starts but returns 503 on `/api/v1/health`**  
The DB is unreachable. Check that `DATABASE_URL` is correct and that your Postgres instance allows connections from Render's IP ranges (or set `0.0.0.0/0` on a dev DB).

**`migrate deploy` fails on startup**  
Make sure `DIRECT_URL` is set to the non-pooled connection string. Prisma requires a direct connection for schema migrations — the pooler (port 6543) won't work here.

**CORS errors in the browser**  
`CORS_ORIGINS` must exactly match the origin the browser sends (scheme + host + optional port, no trailing slash). Check the browser network tab for the exact `Origin` header value.

**Scraper queue not processing jobs**  
`REDIS_URL` is not set or invalid. The app will log `[scraper] REDIS_URL not set — background chapter queue disabled` at startup and fall back to synchronous fetching. Add a Redis instance (Render Redis or Upstash) and set the URL.

**Free tier sleeping**  
Render's free tier spins down after 15 minutes of inactivity, causing a ~30s cold start on the next request. Upgrade to the **Starter** plan ($7/mo) for always-on service.
