# ADR-0001: Feature Flags — Database vs Environment Variables

**Status:** Accepted  
**Date:** 2026-09-09  
**Authors:** Engineering Team  
**Deciders:** Platform Architecture, Admin Panel Team

---

## Context

Arcanium requires runtime-configurable feature flags to control rollout of new features across the platform. The system must support:

1. **Binary on/off toggles** for features like AI Housekeeper, Voice Input, Creator Economy
2. **Gradual rollout** with percentage-based targeting (e.g., enable OFFLINE_READER for 80% of users)
3. **Live operations control** — ability for admins to toggle flags without redeploying
4. **Auditability** — tracking who changed what flag and when

### Current State

- The web app (`apps/web`) currently uses `VITE_FEATURE_FLAG_*` environment variables defined in `.env` files
- The CONSTITUTION (§6.2, P2) specifies env-var based feature flags for build-time control
- The admin panel prototype already treats flags as runtime-mutable with rollout percentages and `updatedAt` timestamps
- The Prisma schema (migrated in Sprint A) includes a `FeatureFlag` model with `enabled`, `rolloutPct`, and `updatedById` fields

### Tension

Environment variable flags require a redeploy to change values — this contradicts the admin panel's design as a live ops control plane. DB-stored flags enable runtime mutation but introduce complexity around defaults and synchronization.

---

## Decision

**Feature flags will be stored in the `FeatureFlag` database table and read at runtime via `GET /api/v1/admin/feature-flags`.**

The existing `VITE_FEATURE_FLAG_*` environment variables in `apps/web` will **remain as fallback defaults** when the database has no record for a given key.

### Implementation

1. **Admin Panel (Primary Interface)**
   - Admins manage flags through `apps/admin` Feature Flags page
   - Changes persist to the `FeatureFlag` table immediately
   - All flag mutations set `updatedById` to track who made the change
   - The UI reflects current DB state on every page load

2. **Backend API**
   - New admin routes:
     - `GET /api/v1/admin/feature-flags` — returns all flags (requires ADMIN/MODERATOR)
     - `PATCH /api/v1/admin/feature-flags/:key` — updates flag state
     - `POST /api/v1/admin/feature-flags` — creates new flag
   - Protected by `requireRole(['ADMIN', 'MODERATOR'])` middleware

3. **Web App (Consumer)**
   - Phase 1: Continue reading `VITE_FEATURE_FLAG_*` env vars (no change)
   - Phase 2 (future): Upgrade to fetch from `/api/v1/feature-flags` public endpoint
   - DB flags take precedence over env vars when both exist

4. **Migration Path**
   - Seed script (`services/backend/prisma/seed.ts`) populates canonical flags on first run
   - Existing deployments work without populated `FeatureFlag` table (env var fallback)
   - New deployments get seeded flags automatically

---

## Consequences

### Positive

✅ **Live ops control** — Admins can toggle features instantly without redeploy  
✅ **Gradual rollout** — Percentage-based targeting enables A/B testing and risk mitigation  
✅ **Audit trail** — Every flag change tracks who (`updatedById`) and when (`updatedAt`)  
✅ **CONSTITUTION compliant** — Env vars remain as P2 fallback (§6.2)  
✅ **Backward compatible** — Existing env-var flags continue working  
✅ **Scale-ready** — DB flags are the industry standard pattern (LaunchDarkly, Unleash, etc.)

### Negative

⚠️ **Database dependency** — Flag reads require DB query (mitigated by caching in future)  
⚠️ **Synchronization complexity** — Must maintain consistency between env vars and DB  
⚠️ **Migration burden** — Requires seeding flags on every fresh deployment

### Neutral

◼️ **Two sources of truth** — Env vars AND DB (resolved by "DB wins" rule)  
◼️ **Admin-only writes** — Only ADMIN/MODERATOR roles can mutate flags (intentional security)

---

## Alternatives Considered

### Alternative 1: Environment Variables Only

**Rejected.** Would require redeploying backend + web app to change any flag. Contradicts the admin panel's purpose as a live control plane. Makes gradual rollout impossible.

### Alternative 2: External Service (LaunchDarkly, Unleash)

**Deferred.** Adds external dependency and cost. DB-stored flags meet current requirements. Can migrate to external service if scale demands (e.g., >100k users, multi-region).

### Alternative 3: Hybrid with Redis Cache

**Deferred.** Redis caching would improve read performance but adds infrastructure complexity. Premature optimization — DB queries are fast enough for current scale. Revisit when flag reads exceed 1000 RPS.

---

## Related Documents

- `CONSTITUTION.md` § 6.2 (P2 Feature Flags)
- `docs/sprints/admin-sprint-plan.md` Sprint E
- `services/backend/prisma/schema.prisma` FeatureFlag model
- `apps/admin/src/pages/FeatureFlagsPage.tsx` UI implementation

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-09-09 | Engineering Team | Initial decision |
