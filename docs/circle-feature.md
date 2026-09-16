# Circle Feature — Design & Implementation Document

> **Status:** Approved for Implementation
> **Last Updated:** September 2026
> **Author:** Arcanium Engineering
> **Constitution Compliance:** Reviewed against all P1–P6 principles and Section 11 Forbidden Patterns

---

## Table of Contents

1. [Overview](#1-overview)
2. [Requirements](#2-requirements)
3. [Data Model](#3-data-model)
4. [Permission Matrix](#4-permission-matrix)
5. [API Contract](#5-api-contract)
6. [Frontend Architecture — apps/web](#6-frontend-architecture--appsweb)
7. [Admin Architecture — apps/admin](#7-admin-architecture--appsadmin)
8. [Type Contracts — packages/types](#8-type-contracts--packagestypes)
9. [API Client — packages/api-client](#9-api-client--packagesapi-client)
10. [Feature Flag & Runtime Config](#10-feature-flag--runtime-config)
11. [Implementation Task List](#11-implementation-task-list)
12. [Future Scope](#12-future-scope)

---

## 1. Overview

Reading Circles are Arcanium's primary community space — focused, persistent groups where scholars gather around shared reading interests, post marginalia reflections and discussion threads, reply to each other, and optionally coordinate live reading sessions around a specific book and chapter.

Circles are distinct from the global Marginalia feed. A post inside a circle belongs to that circle's context. The global community page continues to show the world feed; circles add a layer of intentional, curated community on top.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Creation gate | Role OR rank | Verified Writers, Mods, and Admins always can; regular readers earn it through the existing XP/rank system |
| Rank computation | `computeRank(user.totalXp, ranks)` → `rank.level` | Already fully wired in `xp.service.ts`; no new field on `User` needed |
| Membership model | 3-tier (Owner / Moderator / Member) | Owner has full control; Mods scale moderation without admin involvement |
| Post types | MARGINALIA + DISCUSSION | Preserves the Arcanium aesthetic while allowing open-ended threads |
| Post replies | Threaded one-level replies (`CirclePostReply`) | Part of this implementation; replyCount is always accurate |
| Post echo | Unique-per-user toggle (same pattern as `ReviewReaction`) | Mirrors `toggleEcho` on reviews; prevents spam; returns `echoed: boolean` |
| Session model | One active session at a time, old ones archived | Keeps focus; history remains browsable |
| Visibility | PUBLIC (open join) + PRIVATE (request-to-join) | Both coexist; private circles need Owner/Moderator approval |
| Discovery | Featured strip on community page + dedicated `/circles` directory | Same pattern as Collections |
| Admin control | Full CRUD, pin/feature, post moderation, member management | Circles are community spaces; admins need the same oversight they have everywhere |
| Rank threshold | Configurable via `AppConfig` (no redeploy) | `circle_min_rank_level` key; default `"3"` |
| Feature toggle | `FEATURE_FLAG_CIRCLES` | Independently disableable per Constitution P2 |

---

## 2. Requirements

### 2.1 Functional Requirements

**Circle Creation**
- `VERIFIED_WRITER`, `MODERATOR`, and `ADMIN` roles can always create a circle.
- A user with role `USER` can create a circle if their computed rank level is ≥ `circle_min_rank_level` (read live from `AppConfig`, no cache).
- Rank level is computed server-side via `computeRank(user.totalXp, ranks).rank.level` from `xp.service.ts`. No new field is added to the `User` model.
- The rank threshold is editable by admins at runtime — no redeploy required.
- When a circle is created, the creator is automatically inserted as the circle's OWNER member.

**Membership & Roles**

| Role | Who | Assigned by |
|---|---|---|
| OWNER | The user who created the circle (one per circle) | System on creation |
| MODERATOR | Members promoted by the Owner | Owner |
| MEMBER | Anyone who joined | System on join/approval |

- OWNER can promote/demote members to/from MODERATOR.
- OWNER can remove any member except themselves.
- MODERATOR can remove posts and non-owner members.
- OWNER cannot leave — they must delete the circle (ownership transfer is future scope).

**Joining**
- PUBLIC circles: any authenticated user can join instantly (status = ACTIVE).
- PRIVATE circles: joining creates a `CircleJoinRequest` with status = PENDING. OWNER and MODERATOR can approve or reject.
- Any MEMBER or MODERATOR can leave a circle. OWNER cannot.

**Posts**
Two post types:
- `MARGINALIA` — requires `quote` + `reflection`; optional `chapter` reference. Rendered as the Arcanium quote-card.
- `DISCUSSION` — requires `title` + `body` (plain text). Rendered as a forum thread card.

Any active member (status = ACTIVE) can post. Post author, circle OWNER, and circle MODERATOR can delete a post (soft-delete: `isRemoved = true`).

**Post Echoes (unique-per-user toggle)**
- Follows the exact same pattern as `ReviewReaction` / `toggleEcho` in `review.service.ts`.
- A `CirclePostEcho` join table enforces one echo per user per post.
- On echo: if no row exists → create row + increment `echoCount`. If row exists → delete row + decrement `echoCount`.
- Returns `{ echoed: boolean, echoCount: number }` — mirrors `EchoToggleResponse`.
- `echoCount` on `CirclePost` is a denormalized counter updated atomically in a transaction.

**Post Replies (one level deep)**
- Any active member can reply to any post (MARGINALIA or DISCUSSION).
- Replies are stored in `CirclePostReply`: `postId`, `authorId`, `body` (plain text), `isRemoved`.
- `replyCount` on `CirclePost` is a denormalized counter updated atomically on create/delete.
- Reply author, circle OWNER, and circle MODERATOR can delete a reply (soft-delete: `isRemoved = true`).
- No nested replies — one level only in this implementation.

**Reading Sessions**
- A circle can have one active session at a time (`isActive = true`).
- OWNER and MODERATOR can start a session (`bookTitle`, optional `chapterHint`).
- Starting a new session archives the previous one (`isActive = false`, `endedAt = now()`).
- OWNER and MODERATOR can manually end the active session.
- The active session is displayed as a banner in the circle detail view and as a pill on the circle card.

**Discovery**
- `/community` page shows a "Featured Circles" horizontal strip — up to 4 circles where `isFeatured = true`, ordered by `featuredOrder`. The strip renders nothing when empty (no heading, no placeholder).
- A "View all circles →" link navigates to `/circles`.
- `/circles` is a dedicated directory page with search, visibility filter, and pagination.
- `/circles/:id` is the circle detail page.

**Admin Control**
- Admins can create, edit, delete any circle.
- Admins can toggle `isFeatured` and set `featuredOrder` to control the community page strip.
- Admins can archive a circle (`isArchived = true`) — hidden from public directory, not deleted.
- Admins can view all members, remove any member, view and soft-delete any post or reply.
- Admins can approve or reject join requests for any private circle.
- Admins can edit `circle_min_rank_level` from the circles management page.

### 2.2 Non-Functional Requirements

- `/circles` directory initial chunk must stay within the 150KB budget (Constitution P3).
- Circle detail posts: stale time 2 minutes, consistent with the community overview query.
- Post echo mutation uses optimistic update (same pattern as `useEchoMutation` in `useCommunityQuery.ts`).
- All mutations invalidate relevant query keys on settle.
- `FEATURE_FLAG_CIRCLES = false` → all circle nav hidden, all `/community/circles/*` endpoints return 503, community page strip absent.
- Server-side authorization on every endpoint — no client role claims trusted (Constitution P6).
- `circle_min_rank_level` read live (no in-memory cache) so admin changes take effect on the next request.

---

## 3. Data Model

All changes via `prisma migrate dev`. Direct DB edits are forbidden (Constitution §5.3).

### 3.1 New Enums

```prisma
enum CircleVisibility {
  PUBLIC
  PRIVATE
}

enum CircleMemberRole {
  OWNER
  MODERATOR
  MEMBER
}

enum CircleMemberStatus {
  ACTIVE
  PENDING   // awaiting approval for private circle join requests
  BANNED
}

enum CirclePostType {
  MARGINALIA
  DISCUSSION
}

enum CircleJoinRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 3.2 Extended `ReadingCircle`

Additions to the existing model (existing `id`, `name`, `tag`, `focusTitle`, `isPublic`, `createdAt`, `updatedAt`, `members`, `sessions` are retained for backward compat):

```prisma
model ReadingCircle {
  id            String           @id @default(cuid())
  name          String
  tag           String
  description   String?          @db.VarChar(500)
  focusTitle    String?          // kept for backward compat with existing seed data
  coverColor    String           @default("bg-purple-500")
  visibility    CircleVisibility @default(PUBLIC)
  isPublic      Boolean          @default(true)  // kept for compat; derived from visibility
  isFeatured    Boolean          @default(false)
  featuredOrder Int              @default(0)
  isArchived    Boolean          @default(false)

  // Ownership — every circle has exactly one owner
  ownerId       String
  owner         User             @relation("OwnedCircles", fields: [ownerId], references: [id], onDelete: Cascade)

  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  members       CircleMember[]
  sessions      CircleSession[]
  posts         CirclePost[]
  joinRequests  CircleJoinRequest[]

  @@index([isPublic])
  @@index([isFeatured, featuredOrder])
  @@index([isArchived])
  @@index([ownerId])
}
```

### 3.3 Extended `CircleMember`

```prisma
model CircleMember {
  id        String             @id @default(cuid())
  circleId  String
  circle    ReadingCircle      @relation(fields: [circleId], references: [id], onDelete: Cascade)
  userId    String
  user      User               @relation("CircleMemberships", fields: [userId], references: [id], onDelete: Cascade)
  role      CircleMemberRole   @default(MEMBER)
  status    CircleMemberStatus @default(ACTIVE)
  joinedAt  DateTime           @default(now())

  @@unique([circleId, userId])
  @@index([circleId])
  @@index([userId])
}
```

### 3.4 Extended `CircleSession`

```prisma
model CircleSession {
  id          String        @id @default(cuid())
  circleId    String
  circle      ReadingCircle @relation(fields: [circleId], references: [id], onDelete: Cascade)
  bookTitle   String?
  chapterHint String?       // e.g. "Chapter 12 — The Descent"
  activeNow   Int           @default(0)
  isActive    Boolean       @default(true)
  startedAt   DateTime      @default(now())
  endedAt     DateTime?
  updatedAt   DateTime      @updatedAt

  @@index([circleId, isActive])
}
```

### 3.5 New `CirclePost`

```prisma
model CirclePost {
  id         String        @id @default(cuid())
  circleId   String
  circle     ReadingCircle @relation(fields: [circleId], references: [id], onDelete: Cascade)
  authorId   String
  author     User          @relation("CirclePosts", fields: [authorId], references: [id], onDelete: Cascade)

  type       CirclePostType

  // MARGINALIA fields
  quote      String?       @db.Text
  chapter    String?
  reflection String?       @db.Text

  // DISCUSSION fields
  title      String?
  body       String?       @db.Text

  echoCount  Int           @default(0)
  replyCount Int           @default(0)
  isPinned   Boolean       @default(false)
  isRemoved  Boolean       @default(false)  // soft-delete

  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  echoes     CirclePostEcho[]
  replies    CirclePostReply[]

  @@index([circleId, createdAt])
  @@index([circleId, isRemoved])
  @@index([authorId])
}
```

### 3.6 New `CirclePostEcho` (unique-per-user toggle)

Mirrors the `ReviewReaction` pattern exactly.

```prisma
model CirclePostEcho {
  id        String     @id @default(cuid())
  postId    String
  post      CirclePost @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User       @relation("CirclePostEchoes", fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())

  @@unique([postId, userId])  // one echo per user per post
  @@index([postId])
  @@index([userId])
}
```

### 3.7 New `CirclePostReply`

```prisma
model CirclePostReply {
  id        String     @id @default(cuid())
  postId    String
  post      CirclePost @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User       @relation("CirclePostReplies", fields: [authorId], references: [id], onDelete: Cascade)
  body      String     @db.Text
  isRemoved Boolean    @default(false)  // soft-delete
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([postId, createdAt])
  @@index([authorId])
}
```

### 3.8 New `CircleJoinRequest`

```prisma
model CircleJoinRequest {
  id          String                  @id @default(cuid())
  circleId    String
  circle      ReadingCircle           @relation(fields: [circleId], references: [id], onDelete: Cascade)
  userId      String
  user        User                    @relation("CircleJoinRequests", fields: [userId], references: [id], onDelete: Cascade)
  message     String?                 @db.VarChar(300)
  status      CircleJoinRequestStatus @default(PENDING)
  reviewedBy  String?
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  @@unique([circleId, userId])
  @@index([circleId, status])
  @@index([userId])
}
```

### 3.9 User Model Back-Relations to Add

```prisma
// On the User model — add these relations:
ownedCircles       ReadingCircle[]     @relation("OwnedCircles")
circlePosts        CirclePost[]        @relation("CirclePosts")
circlePostEchoes   CirclePostEcho[]    @relation("CirclePostEchoes")
circlePostReplies  CirclePostReply[]   @relation("CirclePostReplies")
circleJoinReqs     CircleJoinRequest[] @relation("CircleJoinRequests")
```

### 3.10 AppConfig Seed Additions

```
key: "circle_min_rank_level"   value: "3"
```

Read via `prisma.appConfig.findUnique({ where: { key: 'circle_min_rank_level' } })` — no cache, no TTL — so admin changes take effect immediately.

### 3.11 FeatureFlag Seed Addition

```
key:         "FEATURE_FLAG_CIRCLES"
name:        "Reading Circles"
description: "Enables the Reading Circles community feature — creation, joining, posting, replies, and the /circles directory."
category:    CORE_READER
enabled:     false
rolloutPct:  0
```

---

## 4. Permission Matrix

### 4.1 Circle-Level Actions

| Action | Public Non-Member | MEMBER | MODERATOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| View public circle & posts | ✅ | ✅ | ✅ | ✅ | ✅ |
| View private circle (not member) | preview only | — | — | ✅ | ✅ |
| View private circle (member) | — | ✅ | ✅ | ✅ | ✅ |
| Join public circle | ✅ | — | — | — | ✅ |
| Request to join private circle | ✅ | — | — | — | ✅ |
| Approve / reject join requests | ❌ | ❌ | ✅ | ✅ | ✅ |
| Leave circle | ❌ | ✅ | ✅ | ❌ must delete | ✅ |
| Edit circle details | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete circle | ❌ | ❌ | ❌ | ✅ | ✅ |
| Archive / unarchive circle | ❌ | ❌ | ❌ | ❌ | ✅ |
| Feature / unfeature circle | ❌ | ❌ | ❌ | ❌ | ✅ |
| Promote member → moderator | ❌ | ❌ | ❌ | ✅ | ✅ |
| Demote moderator → member | ❌ | ❌ | ❌ | ✅ | ✅ |
| Remove member | ❌ | ❌ | ✅ non-owner | ✅ | ✅ |

### 4.2 Post-Level Actions

| Action | Public Non-Member | MEMBER | MODERATOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Read posts (public circle) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read posts (private circle) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create post | ❌ | ✅ | ✅ | ✅ | ✅ |
| Echo post (toggle, unique) | ✅ authed | ✅ | ✅ | ✅ | ✅ |
| Delete own post | — | ✅ | ✅ | ✅ | ✅ |
| Delete any post | ❌ | ❌ | ✅ | ✅ | ✅ |
| Pin post | ❌ | ❌ | ✅ | ✅ | ✅ |

### 4.3 Reply-Level Actions

| Action | Public Non-Member | MEMBER | MODERATOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Read replies (public circle) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read replies (private circle) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create reply | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete own reply | — | ✅ | ✅ | ✅ | ✅ |
| Delete any reply | ❌ | ❌ | ✅ | ✅ | ✅ |

### 4.4 Session Actions

| Action | MEMBER | MODERATOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| View active session | ✅ | ✅ | ✅ | ✅ |
| View session history | ✅ | ✅ | ✅ | ✅ |
| Start new session | ❌ | ✅ | ✅ | ✅ |
| End active session | ❌ | ✅ | ✅ | ✅ |

### 4.5 Circle Creation Gate

The following logic runs server-side in the `createCircle` handler. No client claim is trusted.

```
canCreate(user, appConfig, ranks):
  if user.role in [VERIFIED_WRITER, MODERATOR, ADMIN] → true
  if user.role === USER:
    minLevel = parseInt(appConfig["circle_min_rank_level"] ?? "3")
    userRankLevel = computeRank(user.totalXp, ranks).rank?.level ?? 0
    return userRankLevel >= minLevel
  return false
```

`computeRank` is imported from `xp.service.ts`. `getRanks()` is called in the same request to get the current rank list. `appConfig` value is fetched fresh from `AppConfig` table on every call — no cache.

---

## 5. API Contract

All endpoints follow the existing envelope: `{ data: T, error: null }` on success and `{ data: null, error: { code, message } }` on failure. All endpoints are under `/api/v1/`. All endpoints require the `authenticate` middleware unless noted.

### 5.1 Community Circle Endpoints (`/api/v1/community/circles/...`)

```
GET    /community/circles
       List circles. Public circles visible to all authenticated users.
       ?page, ?limit, ?search, ?visibility (PUBLIC|PRIVATE|ALL, ALL only for authed)

POST   /community/circles
       Create a circle. Role/rank gated (see §4.5). Body: CreateCircleInput.
       Creates the circle + inserts creator as OWNER member in a transaction.

GET    /community/circles/:id
       Circle detail. Non-members of private circles get a preview-only response
       (name, tag, description, memberCount — no posts).

PATCH  /community/circles/:id
       Update circle details. OWNER only. Body: UpdateCircleInput.

DELETE /community/circles/:id
       Delete circle and cascade all data. OWNER or ADMIN.

POST   /community/circles/:id/join
       Join (PUBLIC → ACTIVE member) or request-to-join (PRIVATE → PENDING request).
       Body: { message? } (used for join request message on private circles).

DELETE /community/circles/:id/leave
       Leave circle. MEMBER or MODERATOR only. OWNER gets 403 with message to delete circle instead.

GET    /community/circles/:id/requests
       List join requests. OWNER or MODERATOR only.
       ?status (PENDING|APPROVED|REJECTED), ?page, ?limit

PATCH  /community/circles/:id/requests/:requestId/approve
       Approve a join request → creates ACTIVE CircleMember. OWNER or MODERATOR.

PATCH  /community/circles/:id/requests/:requestId/reject
       Reject a join request. OWNER or MODERATOR.

GET    /community/circles/:id/members
       List members with role and status.
       ?page, ?limit

PATCH  /community/circles/:id/members/:userId/promote
       Promote MEMBER → MODERATOR. OWNER only.

PATCH  /community/circles/:id/members/:userId/demote
       Demote MODERATOR → MEMBER. OWNER only.

DELETE /community/circles/:id/members/:userId
       Remove a member. OWNER can remove anyone. MODERATOR can remove MEMBERs only.

GET    /community/circles/:id/posts
       List posts (excluding isRemoved=true). Includes reply previews (first 2).
       ?page, ?limit, ?type (MARGINALIA|DISCUSSION)

POST   /community/circles/:id/posts
       Create a post. Active member only. Body: CreateCirclePostInput.

DELETE /community/circles/:id/posts/:postId
       Soft-delete a post (isRemoved=true). Post author, MODERATOR, or OWNER.

POST   /community/circles/:id/posts/:postId/echo
       Toggle echo. Any authenticated user. Returns { echoed: boolean, echoCount: number }.
       Follows ReviewReaction toggle pattern exactly.

PATCH  /community/circles/:id/posts/:postId/pin
       Toggle pin. MODERATOR or OWNER.

GET    /community/circles/:id/posts/:postId/replies
       List replies for a post (excluding isRemoved=true). ?page, ?limit.

POST   /community/circles/:id/posts/:postId/replies
       Create a reply. Active member only. Body: { body: string }.

DELETE /community/circles/:id/posts/:postId/replies/:replyId
       Soft-delete a reply (isRemoved=true). Reply author, MODERATOR, or OWNER.

GET    /community/circles/:id/sessions
       List all sessions (active first, then archived by startedAt desc).

POST   /community/circles/:id/sessions
       Start a new session. MODERATOR or OWNER.
       Archives the current active session atomically. Body: StartSessionInput.

PATCH  /community/circles/:id/sessions/active/end
       End the current active session. MODERATOR or OWNER.
```

### 5.2 Admin Circle Endpoints (`/api/v1/admin/circles/...`)

All protected by `authenticate` + `requireRole('ADMIN', 'MODERATOR')`.

```
GET    /admin/circles
       All circles including private and archived. ?page, ?limit, ?search,
       ?visibility (ALL|PUBLIC|PRIVATE), ?isFeatured, ?isArchived (default false)

POST   /admin/circles
       Create a circle on behalf of any user. Body: AdminCreateCircleInput (includes ownerId).

GET    /admin/circles/:id
       Full detail including pending join requests and all members.

PATCH  /admin/circles/:id
       Update any field on any circle.

DELETE /admin/circles/:id
       Hard delete with cascade.

PATCH  /admin/circles/:id/feature
       Toggle isFeatured and set featuredOrder. Body: { isFeatured: boolean, featuredOrder?: number }.

GET    /admin/circles/:id/members
       All members with role, status, user info. ?page, ?limit.

DELETE /admin/circles/:id/members/:userId
       Remove any member (including moderators, not owner).

GET    /admin/circles/:id/posts
       All posts including isRemoved=true. ?page, ?limit, ?isRemoved.

DELETE /admin/circles/:id/posts/:postId
       Soft-delete any post.

GET    /admin/circles/:id/posts/:postId/replies
       All replies including isRemoved=true.

DELETE /admin/circles/:id/posts/:postId/replies/:replyId
       Soft-delete any reply.

GET    /admin/circles/:id/requests
       All join requests. ?status (PENDING|APPROVED|REJECTED).

PATCH  /admin/circles/:id/requests/:requestId/approve
PATCH  /admin/circles/:id/requests/:requestId/reject

GET    /admin/circle-config
       Returns { minRankLevel: number } from AppConfig.

PATCH  /admin/circle-config
       Updates circle_min_rank_level in AppConfig. Body: { minRankLevel: number }.
```

### 5.3 Extended Community Overview

`GET /api/v1/community/overview` response gains one new field:

```typescript
{
  circles:         ReadingCircle[],    // existing — top 10 active public circles
  featuredCircles: CircleSummary[],   // NEW — isFeatured=true, max 4, ordered by featuredOrder
  posts:           MarginaliaPost[],
  challenge:       CommunityChallenge | null,
}
```

`featuredCircles` is empty array `[]` when no circles are featured. The frontend renders nothing in that case.

### 5.4 Query Parameter Summary

**GET /community/circles**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | — |
| `limit` | number | 20 | max 50 |
| `search` | string | — | name match |
| `visibility` | `PUBLIC\|PRIVATE\|ALL` | `PUBLIC` | `ALL` requires auth and returns only circles the user is a member of + all public |

**GET /admin/circles**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | — |
| `limit` | number | 20 | max 100 |
| `search` | string | — | name match |
| `visibility` | `PUBLIC\|PRIVATE\|ALL` | `ALL` | — |
| `isFeatured` | boolean | — | omit = no filter |
| `isArchived` | boolean | `false` | pass `true` to see archived only |

---

## 6. Frontend Architecture — apps/web

### 6.1 New Feature Directory

```
apps/web/src/features/circles/
├── queryKeys.ts
├── useCirclesQuery.ts
└── components/
    ├── CirclesDirectory.tsx      — /circles route
    ├── CircleCard.tsx            — reused in directory + community strip
    ├── CircleDetailView.tsx      — /circles/:id route
    ├── CirclePostComposer.tsx    — post creation (type selector + fields)
    ├── CirclePostCard.tsx        — type-aware post renderer
    ├── CircleReplyList.tsx       — reply thread under a post
    ├── CircleSessionBanner.tsx   — active session + controls for owner/mod
    └── CreateCircleModal.tsx     — create circle form
```

### 6.2 `queryKeys.ts`

```typescript
export const CIRCLES_KEYS = {
  all:               ['circles']                            as const,
  lists:             () => [...CIRCLES_KEYS.all, 'list']   as const,
  list:              (p?: object) => [...CIRCLES_KEYS.lists(), p] as const,
  detail:            (id: string) => [...CIRCLES_KEYS.all, 'detail', id] as const,
  posts:             (id: string) => [...CIRCLES_KEYS.all, 'posts', id] as const,
  replies:           (postId: string) => [...CIRCLES_KEYS.all, 'replies', postId] as const,
  members:           (id: string) => [...CIRCLES_KEYS.all, 'members', id] as const,
  requests:          (id: string) => [...CIRCLES_KEYS.all, 'requests', id] as const,
  sessions:          (id: string) => [...CIRCLES_KEYS.all, 'sessions', id] as const,
};
```

### 6.3 `useCirclesQuery.ts` — All Hooks

```typescript
// Queries
useCirclesDirectory(params?)         // paginated list, used on /circles
useCircleDetail(circleId)            // full detail + active session

// Post queries
useCirclePosts(circleId, params?)    // paginated posts for a circle
useCircleReplies(postId)             // replies for a single post

// Member / request queries
useCircleMembers(circleId)
useCircleRequests(circleId)          // OWNER / MOD only
useCircleSessions(circleId)

// Circle mutations
useCreateCircle()
useUpdateCircle(circleId)
useDeleteCircle()
useJoinCircle()
useLeaveCircle()
useApproveRequest()
useRejectRequest()
usePromoteMember()
useDemoteMember()
useRemoveMember()

// Post mutations
useCreatePost(circleId)
useDeletePost()
useToggleEchoPost()                  // optimistic: mirrors useEchoMutation pattern
                                     // toggles echoed state + adjusts echoCount locally
usePinPost()

// Reply mutations
useCreateReply(postId)               // optimistic: increments replyCount immediately
useDeleteReply()
```

**Echo optimistic update strategy** (mirrors existing `useEchoMutation`):
```
onMutate: snapshot posts → setQueryData toggling echoed + ±1 echoCount
onError:  restore snapshot
onSettled: invalidate CIRCLES_KEYS.posts(circleId)
```

**Reply optimistic update strategy**:
```
onMutate (create): snapshot replies → prepend new reply + increment replyCount on parent post
onMutate (delete): snapshot replies → mark isRemoved + decrement replyCount on parent post
onError:  restore snapshot
onSettled: invalidate CIRCLES_KEYS.replies(postId) + CIRCLES_KEYS.posts(circleId)
```

### 6.4 New Routes

Added to both desktop and mobile `<Routes>` in `App.jsx` (lazy-loaded, separate chunks):

```jsx
const CirclesDirectory = lazy(() => import('./features/circles/components/CirclesDirectory'));
const CircleDetailView = lazy(() => import('./features/circles/components/CircleDetailView'));

// In both desktop and mobile <Routes>:
<Route path="/circles"     element={<CirclesDirectory />} />
<Route path="/circles/:id" element={<CircleDetailView />} />
```

Also added to `AppRouter.tsx` exports so `App.jsx` can use the same lazy instances.

### 6.5 Navigation Changes

**`DesktopSidebar.jsx`** — add between Community and Profile:
```javascript
{
  label: 'Reading Circles',
  path: '/circles',
  icon: <CircleDot className="w-5 h-5 shrink-0 text-purple-500 dark:text-purple-400" />,
}
```
Gated behind `features.circles`.

**`BottomNav.jsx`** — if tab count allows, add a Circles tab. If space is constrained, Circles is accessible via the community page strip — do not overflow the bottom nav. (Evaluate during implementation.)

### 6.6 Community Page Changes (`CommunityView.tsx`)

Add `FeaturedCirclesStrip` sub-component, inserted between the challenge banner and the dual-column section:

```
[Weekly Challenge Banner]
[FeaturedCirclesStrip]       ← NEW (renders null when featuredCircles is empty)
[Reading Circles col | Marginalia Feed col]
```

`FeaturedCirclesStrip` renders:
- Section heading "Featured Circles" + "View all →" link to `/circles`
- Horizontal scroll strip of up to 4 `CircleCard` mini-cards
- Permission-aware "Create a Circle" CTA (visible only if user meets creation criteria — check via `user.role` and `user.xp.rank.level` from the auth store)

---

## 7. Admin Architecture — apps/admin

### 7.1 New Files

```
apps/admin/src/
├── pages/CirclesPage.tsx
└── hooks/useCircleManagement.ts
```

### 7.2 `useCircleManagement.ts` Interface

```typescript
// Query state
circles, isLoading, isError, total
searchQuery, setSearchQuery
visibilityFilter, setVisibilityFilter   // ALL | PUBLIC | PRIVATE
statusFilter, setStatusFilter           // ALL | ACTIVE | ARCHIVED | FEATURED

// Circle CRUD
createCircle(data: AdminCreateCircleInput)
updateCircle(id: string, data: Partial<AdminCreateCircleInput>)
deleteCircle(id: string)
archiveCircle(id: string, isArchived: boolean)
featureCircle(id: string, isFeatured: boolean, featuredOrder?: number)

// Member management
removeCircleMember(circleId: string, userId: string)
promoteCircleMember(circleId: string, userId: string)
demoteCircleMember(circleId: string, userId: string)

// Join requests
approveRequest(circleId: string, requestId: string)
rejectRequest(circleId: string, requestId: string)

// Post & reply moderation
removeCirclePost(circleId: string, postId: string)
removeCircleReply(circleId: string, postId: string, replyId: string)

// Runtime config
circleMinRankLevel: number
setCircleMinRankLevel(level: number): void   // local draft
saveCircleConfig(): Promise<void>            // writes to AppConfig
configSaving: boolean
configError: string | null
```

All mutations call `queryClient.invalidateQueries` on settle. Config save uses the existing `XpSourcesCard` pattern from `RanksPage.tsx` (local draft state + Save button + error display).

### 7.3 `CirclesPage.tsx` Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Reading Circles                [N Circles badge]   [+ New Circle]      │
│  Manage all circles, members, posts, and join requests                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [Search input]  [Visibility: All|Public|Private]  [Status: All|...]   │
├─────────────────────────────────────────────────────────────────────────┤
│  TABLE                                                                   │
│  Name/Tag  |  Visibility  |  Owner  |  Members  |  Posts  |  Featured  │
│  ──────────────────────────────────────────────────────────────────────  │
│  Arcane Lit  PUBLIC        user1     142          318       ⭐ [toggle] │
│  Dark Reads  PRIVATE       user2      28           91       —  [toggle] │
│                                              [Archive] [Delete] [Detail]│
├─────────────────────────────────────────────────────────────────────────┤
│  CIRCLE MIN RANK CONFIG                                                  │
│  Minimum rank level for USER-role circle creation (1–10)                │
│  Default: 3 (Keeper of Pages — 1,200 XP)                               │
│  [  3  ]  Save Changes                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Circle Detail Modal — three tabs:**

- **Posts** — paginated table: type badge (MARGINALIA / DISCUSSION), author, excerpt (50 chars), echoCount, replyCount, date, [Remove] button. Removed posts shown with strikethrough + "Removed" badge.
- **Members** — table: avatar initials, displayName, role badge (OWNER / MOD / MEMBER), status, joinedAt, [Promote/Demote] [Remove]. OWNER row: actions disabled.
- **Join Requests** — visible for PRIVATE circles only. Table: user, message excerpt, date, [Approve] [Reject]. Empty state: "No pending requests".

**Create / Edit modal fields:**
- Name (required), Tag (required), Description, Visibility (PUBLIC/PRIVATE), Cover Color (tailwind class picker), Owner (user search — admin assign), isFeatured toggle, Featured Order (number, visible when isFeatured = true)

### 7.4 Router + Sidebar Changes

```tsx
// apps/admin/src/App.tsx
<Route path="circles" element={<CirclesPage />} />

// apps/admin/src/components/layout/Sidebar.tsx
// Insert between "Special Collections" and "Default Avatars"
{
  label: 'Reading Circles',
  path: '/circles',
  icon: <CircleDot className="w-5 h-5 shrink-0 text-purple-500 dark:text-purple-400" />,
}
```

`CircleDot` is available in lucide-react. No new dependency needed.

---

## 8. Type Contracts — packages/types

### New file: `packages/types/src/circle.ts`

```typescript
// ── Enums ──────────────────────────────────────────────────────────────────

export const CircleVisibilitySchema        = z.enum(['PUBLIC', 'PRIVATE'])
export const CircleMemberRoleSchema        = z.enum(['OWNER', 'MODERATOR', 'MEMBER'])
export const CircleMemberStatusSchema      = z.enum(['ACTIVE', 'PENDING', 'BANNED'])
export const CirclePostTypeSchema          = z.enum(['MARGINALIA', 'DISCUSSION'])
export const CircleJoinRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

// ── Session ────────────────────────────────────────────────────────────────

export const CircleSessionSchema = z.object({
  id:          z.string().cuid(),
  bookTitle:   z.string().nullable(),
  chapterHint: z.string().nullable(),
  activeNow:   z.number().int(),
  isActive:    z.boolean(),
  startedAt:   z.string().datetime(),
  endedAt:     z.string().datetime().nullable(),
})

// ── Echo toggle response ───────────────────────────────────────────────────

export const CircleEchoResponseSchema = z.object({
  postId:    z.string().cuid(),
  echoed:    z.boolean(),
  echoCount: z.number().int(),
})
// type: CircleEchoResponse

// ── Reply ──────────────────────────────────────────────────────────────────

export const CirclePostReplySchema = z.object({
  id:        z.string().cuid(),
  postId:    z.string().cuid(),
  authorId:  z.string().cuid(),
  author:    z.string(),           // displayName
  avatarUrl: z.string().nullable(),
  body:      z.string(),
  isRemoved: z.boolean(),
  time:      z.string(),           // relative, e.g. "3m ago"
  createdAt: z.string().datetime(),
})

export const CirclePostReplyListSchema = z.object({
  replies: z.array(CirclePostReplySchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
})

// ── Post ───────────────────────────────────────────────────────────────────

export const CirclePostSchema = z.object({
  id:         z.string().cuid(),
  circleId:   z.string().cuid(),
  authorId:   z.string().cuid(),
  author:     z.string(),
  avatarUrl:  z.string().nullable(),
  role:       z.string(),          // e.g. "Lv.4 Lore Seeker"
  time:       z.string(),
  type:       CirclePostTypeSchema,

  // MARGINALIA
  quote:      z.string().nullable(),
  chapter:    z.string().nullable(),
  reflection: z.string().nullable(),

  // DISCUSSION
  title:      z.string().nullable(),
  body:       z.string().nullable(),

  echoCount:  z.number().int(),
  replyCount: z.number().int(),
  isPinned:   z.boolean(),
  isRemoved:  z.boolean(),
  echoed:     z.boolean(),         // has the requesting user echoed this post?
  createdAt:  z.string().datetime(),

  // Preview of first 2 replies (included in list response, not detail)
  replyPreview: z.array(CirclePostReplySchema).optional(),
})

export const CirclePostListSchema = z.object({
  posts:   z.array(CirclePostSchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
})

// ── Member ─────────────────────────────────────────────────────────────────

export const CircleMemberSchema = z.object({
  id:          z.string().cuid(),
  userId:      z.string().cuid(),
  displayName: z.string(),
  avatarUrl:   z.string().nullable(),
  role:        CircleMemberRoleSchema,
  status:      CircleMemberStatusSchema,
  joinedAt:    z.string().datetime(),
})

// ── Join Request ───────────────────────────────────────────────────────────

export const CircleJoinRequestSchema = z.object({
  id:          z.string().cuid(),
  circleId:    z.string().cuid(),
  userId:      z.string().cuid(),
  displayName: z.string(),
  avatarUrl:   z.string().nullable(),
  message:     z.string().nullable(),
  status:      CircleJoinRequestStatusSchema,
  createdAt:   z.string().datetime(),
})

// ── Circle Summary (list item) ─────────────────────────────────────────────

export const CircleSummarySchema = z.object({
  id:            z.string().cuid(),
  name:          z.string(),
  tag:           z.string(),
  description:   z.string().nullable(),
  coverColor:    z.string(),
  visibility:    CircleVisibilitySchema,
  memberCount:   z.number().int(),
  activeNow:     z.number().int(),
  isFeatured:    z.boolean(),
  featuredOrder: z.number().int(),
  isArchived:    z.boolean(),
  ownerId:       z.string().cuid(),
  ownerName:     z.string(),
  activeSession: CircleSessionSchema.nullable(),
  // Whether the requesting user is a member (and their role)
  membership:    z.object({ role: CircleMemberRoleSchema, status: CircleMemberStatusSchema }).nullable(),
  createdAt:     z.string().datetime(),
})

// ── Circle Detail (single circle page) ────────────────────────────────────

export const CircleDetailSchema = CircleSummarySchema.extend({
  // posts and members are fetched via separate paginated queries, not embedded
  // pendingRequestCount: for owner/mod to show badge
  pendingRequestCount: z.number().int(),
})

// ── Circle List Response ───────────────────────────────────────────────────

export const CircleListResponseSchema = z.object({
  circles: z.array(CircleSummarySchema),
  total:   z.number().int(),
  page:    z.number().int(),
  hasMore: z.boolean(),
})

// ── Input Schemas ──────────────────────────────────────────────────────────

export const CreateCircleSchema = z.object({
  name:        z.string().min(3).max(80),
  tag:         z.string().min(2).max(30),
  description: z.string().max(500).optional(),
  coverColor:  z.string().optional(),
  visibility:  CircleVisibilitySchema.default('PUBLIC'),
})

export const UpdateCircleSchema = CreateCircleSchema.partial()

export const CreateCirclePostSchema = z.discriminatedUnion('type', [
  z.object({
    type:       z.literal('MARGINALIA'),
    quote:      z.string().min(10).max(1000),
    reflection: z.string().min(10).max(2000),
    chapter:    z.string().max(100).optional(),
  }),
  z.object({
    type:  z.literal('DISCUSSION'),
    title: z.string().min(3).max(200),
    body:  z.string().min(10).max(5000),
  }),
])

export const CreateCircleReplySchema = z.object({
  body: z.string().min(1).max(1000),
})

export const StartSessionSchema = z.object({
  bookTitle:   z.string().max(200).optional(),
  chapterHint: z.string().max(200).optional(),
})

// ── Admin-only shapes ──────────────────────────────────────────────────────

export const AdminCreateCircleSchema = CreateCircleSchema.extend({
  ownerId: z.string().cuid(),
})

export const AdminCircleSummarySchema = CircleSummarySchema.extend({
  postCount:           z.number().int(),
  pendingRequestCount: z.number().int(),
})

export const AdminCircleDetailSchema = CircleDetailSchema.extend({
  members:  z.array(CircleMemberSchema),
  requests: z.array(CircleJoinRequestSchema),
})

export const CircleConfigSchema = z.object({
  minRankLevel: z.number().int().min(1).max(10),
})
```

All types and schemas exported from `packages/types/src/index.ts`.

---

## 9. API Client — packages/api-client

### New `circlesApi` export

```typescript
export const circlesApi = {
  // Directory & detail
  list:           (params?: CircleListParams) =>
    apiClient.get<CircleListResponse>(`/api/v1/community/circles${buildQs(params)}`),
  get:            (circleId: string) =>
    apiClient.get<CircleDetail>(`/api/v1/community/circles/${circleId}`),

  // CRUD
  create:         (body: CreateCircleInput) =>
    apiClient.post<CircleSummary>('/api/v1/community/circles', body),
  update:         (circleId: string, body: UpdateCircleInput) =>
    apiClient.patch<CircleSummary>(`/api/v1/community/circles/${circleId}`, body),
  delete:         (circleId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/api/v1/community/circles/${circleId}`),

  // Membership
  join:           (circleId: string, body?: { message?: string }) =>
    apiClient.post<{ joined: boolean; status: string }>(`/api/v1/community/circles/${circleId}/join`, body),
  leave:          (circleId: string) =>
    apiClient.delete<{ left: boolean }>(`/api/v1/community/circles/${circleId}/leave`),

  // Join requests
  listRequests:   (circleId: string, params?) =>
    apiClient.get<CircleJoinRequest[]>(`/api/v1/community/circles/${circleId}/requests${buildQs(params)}`),
  approveRequest: (circleId: string, requestId: string) =>
    apiClient.patch<CircleJoinRequest>(`/api/v1/community/circles/${circleId}/requests/${requestId}/approve`, {}),
  rejectRequest:  (circleId: string, requestId: string) =>
    apiClient.patch<CircleJoinRequest>(`/api/v1/community/circles/${circleId}/requests/${requestId}/reject`, {}),

  // Members
  listMembers:    (circleId: string) =>
    apiClient.get<CircleMember[]>(`/api/v1/community/circles/${circleId}/members`),
  promote:        (circleId: string, userId: string) =>
    apiClient.patch<CircleMember>(`/api/v1/community/circles/${circleId}/members/${userId}/promote`, {}),
  demote:         (circleId: string, userId: string) =>
    apiClient.patch<CircleMember>(`/api/v1/community/circles/${circleId}/members/${userId}/demote`, {}),
  removeMember:   (circleId: string, userId: string) =>
    apiClient.delete<{ removed: boolean }>(`/api/v1/community/circles/${circleId}/members/${userId}`),

  // Posts
  listPosts:      (circleId: string, params?) =>
    apiClient.get<CirclePostList>(`/api/v1/community/circles/${circleId}/posts${buildQs(params)}`),
  createPost:     (circleId: string, body: CreateCirclePostInput) =>
    apiClient.post<CirclePost>(`/api/v1/community/circles/${circleId}/posts`, body),
  deletePost:     (circleId: string, postId: string) =>
    apiClient.delete<{ removed: boolean }>(`/api/v1/community/circles/${circleId}/posts/${postId}`),
  echoPost:       (circleId: string, postId: string) =>
    apiClient.post<CircleEchoResponse>(`/api/v1/community/circles/${circleId}/posts/${postId}/echo`),
  pinPost:        (circleId: string, postId: string) =>
    apiClient.patch<CirclePost>(`/api/v1/community/circles/${circleId}/posts/${postId}/pin`, {}),

  // Replies
  listReplies:    (circleId: string, postId: string, params?) =>
    apiClient.get<CirclePostReplyList>(`/api/v1/community/circles/${circleId}/posts/${postId}/replies${buildQs(params)}`),
  createReply:    (circleId: string, postId: string, body: CreateCircleReplyInput) =>
    apiClient.post<CirclePostReply>(`/api/v1/community/circles/${circleId}/posts/${postId}/replies`, body),
  deleteReply:    (circleId: string, postId: string, replyId: string) =>
    apiClient.delete<{ removed: boolean }>(`/api/v1/community/circles/${circleId}/posts/${postId}/replies/${replyId}`),

  // Sessions
  listSessions:   (circleId: string) =>
    apiClient.get<CircleSession[]>(`/api/v1/community/circles/${circleId}/sessions`),
  startSession:   (circleId: string, body: StartSessionInput) =>
    apiClient.post<CircleSession>(`/api/v1/community/circles/${circleId}/sessions`, body),
  endSession:     (circleId: string) =>
    apiClient.patch<CircleSession>(`/api/v1/community/circles/${circleId}/sessions/active/end`, {}),
}
```

### Additions to `adminApi`

```typescript
// Circles management
listCircles:          (params?) => apiClient.get(...)
getCircle:            (circleId) => apiClient.get(...)
createCircle:         (body: AdminCreateCircleInput) => apiClient.post(...)
updateCircle:         (circleId, body) => apiClient.patch(...)
deleteCircle:         (circleId) => apiClient.delete(...)
featureCircle:        (circleId, body: { isFeatured: boolean; featuredOrder?: number }) => apiClient.patch(...)

listCircleMembers:    (circleId) => apiClient.get(...)
removeCircleMember:   (circleId, userId) => apiClient.delete(...)
promoteCircleMember:  (circleId, userId) => apiClient.patch(...)
demoteCircleMember:   (circleId, userId) => apiClient.patch(...)

listCirclePosts:      (circleId, params?) => apiClient.get(...)
removeCirclePost:     (circleId, postId) => apiClient.delete(...)
listCircleReplies:    (circleId, postId) => apiClient.get(...)
removeCircleReply:    (circleId, postId, replyId) => apiClient.delete(...)

listCircleRequests:   (circleId, params?) => apiClient.get(...)
approveCircleRequest: (circleId, requestId) => apiClient.patch(...)
rejectCircleRequest:  (circleId, requestId) => apiClient.patch(...)

getCircleConfig:      () => apiClient.get<CircleConfig>('/api/v1/admin/circle-config')
updateCircleConfig:   (body: { minRankLevel: number }) => apiClient.patch('/api/v1/admin/circle-config', body)
```

All circle types imported from `@arcanium/types` and re-exported where needed.

---

## 10. Feature Flag & Runtime Config

### Feature Flag

| Key | Category | Default | Effect when disabled |
|---|---|---|---|
| `FEATURE_FLAG_CIRCLES` | `CORE_READER` | `false` | All `/community/circles/*` and `/admin/circles/*` endpoints return 503; Circles nav items absent; `featuredCircles` in overview returns `[]`; Create/Join CTAs hidden |

- Checked server-side on every circle endpoint as the first guard before any DB operation.
- Checked client-side in `apps/web/src/config/features.ts` via `FEATURE_FLAG_CIRCLES` env var.
- Added to root `.env.example` with comment: `# Set to true to enable the Reading Circles community feature`

### Runtime Config

| AppConfig Key | Default | Type | Description |
|---|---|---|---|
| `circle_min_rank_level` | `"3"` | integer string | Minimum `RankDefinition.level` for `USER`-role users to create circles. 1 = anyone, 10 = only the top rank. |

- Read as `parseInt(row.value, 10)` — no in-memory cache — in the `createCircle` handler.
- The corresponding rank title is shown as a hint in the admin config card (e.g. "3 — Keeper of Pages, 1,200 XP").
- Editable from the `CirclesPage` config card, matching the `XpSourcesCard` UI pattern.

---

## 11. Implementation Task List

Tasks are in strict dependency order. Each task must compile and build cleanly before starting the next.

- [ ] **Task 1 — Prisma Schema + Migration**
  - Add 5 new enums: `CircleVisibility`, `CircleMemberRole`, `CircleMemberStatus`, `CirclePostType`, `CircleJoinRequestStatus`
  - Extend `ReadingCircle`: add `description`, `coverColor`, `visibility`, `isFeatured`, `featuredOrder`, `isArchived`, `ownerId` + `owner` relation
  - Extend `CircleMember`: add `role`, `status`
  - Extend `CircleSession`: add `bookTitle`, `chapterHint`, `isActive`, `startedAt`, `endedAt`
  - Add `CirclePost` model with all fields + `echoes` + `replies` relations
  - Add `CirclePostEcho` model (unique `[postId, userId]`) — mirrors `ReviewReaction`
  - Add `CirclePostReply` model
  - Add `CircleJoinRequest` model
  - Add 5 back-relations to `User`: `ownedCircles`, `circlePosts`, `circlePostEchoes`, `circlePostReplies`, `circleJoinReqs`
  - Add `circle_min_rank_level` to `AppConfig` seeder
  - Add `FEATURE_FLAG_CIRCLES` to `FeatureFlag` seeder
  - Run `prisma migrate dev --name add_circles_feature`
  - Verify `prisma generate` produces no type errors

- [ ] **Task 2 — Type Contracts (`packages/types`)**
  - Create `packages/types/src/circle.ts` with all Zod schemas and inferred types (see §8)
  - Export everything from `packages/types/src/index.ts`
  - Run `tsc --noEmit` across the monorepo — zero errors before proceeding

- [ ] **Task 3 — Backend Community Circle Service + Routes**
  - Create `services/backend/src/middleware/requireCircleRole.ts`
    - Reads `circleId` from `req.params`, queries `CircleMember` for the requesting user
    - Attaches `req.circleMembership: { role, status }` to the request object
    - Exports `requireCircleOwner`, `requireCircleMod` (mod or owner), `requireCircleMember` (active member)
  - Create `services/backend/src/services/circles.service.ts` with all handlers (see §5.1)
    - `createCircle`: feature flag check → rank/role gate using `computeRank` + `getRanks` from `xp.service.ts` + live `AppConfig` read → create circle + owner member in a `$transaction`
    - `echoCirclePost`: follows `toggleEcho` from `review.service.ts` exactly — `findUnique` on `CirclePostEcho` → toggle + update `echoCount` in `$transaction`
    - `createReply`: create `CirclePostReply` + increment `post.replyCount` in `$transaction`
    - `deleteReply`: soft-delete + decrement `replyCount` in `$transaction`
    - All handlers validate request bodies with Zod schemas from Task 2
  - Register all routes in `services/backend/src/routes/community.ts` under `/circles` prefix
  - Feature flag guard function: `checkCirclesEnabled()` — checks `FeatureFlag` where `key = 'FEATURE_FLAG_CIRCLES'`, returns 503 if `!enabled`

- [ ] **Task 4 — Backend Admin Circle Service + Routes**
  - Add all admin circle handlers to `services/backend/src/services/admin.service.ts` (see §5.2)
  - Add `getCircleConfig` and `updateCircleConfig` handlers
  - Register all routes in `services/backend/src/routes/admin.ts` under `/circles` and `/circle-config` prefixes
  - Confirm `requireRole('ADMIN', 'MODERATOR')` middleware is applied (already present on `adminRouter`)

- [ ] **Task 5 — API Client (`packages/api-client`)**
  - Add `circlesApi` export to `packages/api-client/src/index.ts` (see §9)
  - Add admin circle methods to `adminApi` (see §9)
  - Import and re-export all new types from `@arcanium/types`
  - Run `tsc --noEmit` — zero errors

- [ ] **Task 6 — Web App Circles Feature (Directory + Detail)**
  - Create `apps/web/src/features/circles/` directory (see §6.1)
  - Implement `queryKeys.ts`
  - Implement `useCirclesQuery.ts` — all hooks with optimistic updates for echo and replies (see §6.3)
  - Build `CirclesDirectory.tsx` — search input, visibility filter chips, paginated grid of `CircleCard`, "Create Circle" button (gated by computed permission from `useUserStore`)
  - Build `CircleCard.tsx` — name, tag, description excerpt, visibility badge, memberCount, activeNow dot, session pill if active
  - Build `CircleDetailView.tsx` — header (name, tag, description, Join/Leave button, pending requests badge for owner/mod), `CircleSessionBanner`, post feed, `CirclePostComposer`
  - Build `CirclePostComposer.tsx` — type selector tab (Marginalia / Discussion) + appropriate fields + Submit; uses `useCreatePost`
  - Build `CirclePostCard.tsx` — type-aware rendering; echo button with optimistic toggle; reply count button that expands `CircleReplyList`; pin indicator; delete button (shown to author/mod/owner)
  - Build `CircleReplyList.tsx` — lazy-loads on expand; reply items with author, time, body, delete button; "Write a reply" inline input using `useCreateReply`
  - Build `CircleSessionBanner.tsx` — displays `bookTitle` + `chapterHint`; OWNER/MOD sees "End Session" and "New Session" buttons
  - Build `CreateCircleModal.tsx` — form with name, tag, description, visibility toggle, cover color picker
  - Add lazy routes to `App.jsx` (both desktop and mobile) and `AppRouter.tsx`
  - Add Circles nav item to `DesktopSidebar.jsx` (gated behind `features.circles`)

- [ ] **Task 7 — Featured Circles Strip in `CommunityView.tsx`**
  - Extend `getCommunityOverview` in `community.service.ts` to include `featuredCircles` query
  - Extend `CommunityOverviewSchema` in `packages/types/src/community.ts` with `featuredCircles: z.array(CircleSummarySchema)`
  - Build `FeaturedCirclesStrip` sub-component inside `CommunityView.tsx`
    - Renders `null` when `featuredCircles` is empty (no empty state, no heading)
    - Horizontal scroll strip of up to 4 mini `CircleCard` components
    - "View all circles →" link navigating to `/circles`
    - Permission-aware "Create a Circle" CTA
  - Insert strip between challenge banner and dual-column section

- [ ] **Task 8 — Admin `CirclesPage`**
  - Create `useCircleManagement.ts` hook (see §7.2)
  - Build `CirclesPage.tsx` (see §7.3) — table, Detail modal with 3 tabs (Posts / Members / Join Requests), Create/Edit modal, Min Rank Config card
  - Add `<Route path="circles" element={<CirclesPage />} />` to `apps/admin/src/App.tsx`
  - Add "Reading Circles" nav item with `CircleDot` icon to `Sidebar.tsx` between "Special Collections" and "Default Avatars"

- [ ] **Task 9 — Feature Flag + Runtime Config Wiring**
  - Add `circles: import.meta.env.FEATURE_FLAG_CIRCLES === 'true'` to `apps/web/src/config/features.ts`
  - Gate Circles nav item in `DesktopSidebar.jsx` behind `features.circles`
  - Gate `FeaturedCirclesStrip` behind `features.circles` (renders null when disabled)
  - Gate `/circles` and `/circles/:id` routes — redirect to `/community` when `!features.circles`
  - Add `FEATURE_FLAG_CIRCLES=false` to root `.env.example` with documentation comment
  - Smoke test: toggle flag off → nav absent, endpoints return 503, community page strip hidden; toggle on → all visible

---

## 12. Future Scope

These are explicitly out of scope for this implementation but documented to avoid design decisions that would block them.

- **Ownership transfer** — Owner can hand OWNER role to another member. Currently blocked by "OWNER cannot leave" constraint.
- **Direct invitations** — Owner/Mod can send invite links or direct invites by userId to bring users into private circles.
- **Nested reply threads** — Replies to replies (depth 2+). The current model supports adding `parentReplyId` to `CirclePostReply` later.
- **Circle notifications** — Push or in-app notifications for new posts in joined circles.
- **Circle XP events** — Award XP for circle creation (`CIRCLE_CREATE`), first post (`CIRCLE_POST`), etc. The `XpSource` type and `grantXp` function are already designed to accept new sources.
- **Circle badges** — "Circle Founder", "Active Contributor", etc. — manual or auto-unlock via the existing `Badge` system.
- **Explore page integration** — Surface active/featured circles on the `/explore` page alongside content.
- **Circle search** — Full-text search across circle names and descriptions.
- **Private circle discovery** — A curated directory of private circles where users can request access.
- **Circle analytics in admin** — Post volume over time, member growth chart, session frequency.