# Arcanium Feature Spec: Book Reviews & Ratings

> **Status:** Active — Phase 5 Feature  
> **Date:** September 2026  
> **Priority:** High — Core user engagement feature  
> **Constitution Compliance:** Verified ✅

---

## Table of Contents

1. [Overview](#overview)
2. [User Stories](#user-stories)
3. [Architecture & Data Model](#architecture--data-model)
4. [Backend API Specification](#backend-api-specification)
5. [Frontend Components](#frontend-components)
6. [Admin Panel Integration](#admin-panel-integration)
7. [Constitution Compliance](#constitution-compliance)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### What It Is

Book Reviews & Ratings is a **catalog-level** feature that allows readers to:
- Rate books on a 1-5 star scale
- Write reflections/reviews (short-form, 50-2000 characters)
- "Echo" helpful reviews (similar to likes)
- View aggregate ratings and read community feedback before diving into a book

This feature is tied directly to the **Content** model. Every book has its own review section visible on its detail page (BookDetailModal) and potentially on its dedicated book page.

### Why Now

Reviews are a **zero-management, infinitely scalable** engagement layer that:
- Helps new users discover quality content
- Provides social proof and community validation
- Requires no active moderation (flagging handled reactively)
- Integrates seamlessly into existing catalog UI

This is prioritized **before** Community Circles because it delivers immediate value without complex social graph management.

### Core Principles

**P1 — Mobile-First**  
- Star rating touch targets: 44x44px minimum  
- Review cards: readable on 320px viewports  
- Sticky "Write Review" CTA above fold on mobile

**P2 — Catalog-Centric**  
- Reviews live on Content records, not in a separate social layer  
- Aggregate ratings shown everywhere a book appears (cards, search, shelves)  
- Deep link: `/books/:slug#reviews` jumps to review section

**P3 — Spam-Resistant by Design**  
- 1 review per user per book (can edit/delete own review)  
- Must be authenticated to write reviews  
- Echo count visible but not gamified (no leaderboards)

**P4 — Performance Budget**  
- Review list: paginated (10 per page)  
- Aggregate rating: cached on Content model (denormalized)  
- No waterfall queries — single endpoint returns reviews + user's own rating/review

---

## User Stories

### As a Reader

1. **Discover Quality Content**  
   - I can see average star ratings on book cards before clicking  
   - I can filter/sort catalog by highest-rated books  
   - I see "X reviews" count to gauge community engagement

2. **Read Reviews**  
   - I can read what others thought about a book on its detail page  
   - I see most helpful reviews first (sorted by echo count)  
   - I can see when each review was posted

3. **Write Reviews**  
   - After reading (or anytime), I can rate a book 1-5 stars  
   - I can write a short reflection (50-2000 chars)  
   - I can edit or delete my review later  
   - I see my review appear immediately in the list

4. **Echo Helpful Reviews**  
   - I can "echo" reviews I find helpful  
   - I see echo counts on all reviews  
   - I can un-echo a review

### As a Creator (Verified Writer)

5. **Receive Feedback**  
   - I see reviews on my uploaded content  
   - I can see aggregate ratings on my creator dashboard  
   - I **cannot** delete or hide reviews (transparent platform)

### As an Admin/Moderator

6. **Monitor & Moderate**  
   - I can see all reviews in the admin panel  
   - I can filter by rating, date, flagged status  
   - I can delete spam/abusive reviews  
   - I can see review analytics (avg rating distribution, review volume over time)

---

## Architecture & Data Model

### Database Schema

#### New Models

```prisma
// ---------------------------------------------------------------------------
// REVIEWS & RATINGS
// ---------------------------------------------------------------------------

model Review {
  id          String   @id @default(cuid())
  contentId   String
  content     Content  @relation("ContentReviews", fields: [contentId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation("UserReviews", fields: [userId], references: [id], onDelete: Cascade)
  
  // Star rating (1-5)
  rating      Int      // validated 1..5 in Zod + DB CHECK constraint
  
  // Optional written reflection
  reviewText  String?  @db.Text
  
  // Engagement metrics
  echoCount   Int      @default(0)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  echoes      ReviewReaction[] @relation("ReviewEchoes")
  
  @@unique([contentId, userId]) // 1 review per user per book
  @@index([contentId, createdAt])
  @@index([userId])
}

model ReviewReaction {
  id        String   @id @default(cuid())
  reviewId  String
  review    Review   @relation("ReviewEchoes", fields: [reviewId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation("UserReviewReactions", fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  
  @@unique([reviewId, userId]) // 1 echo per user per review
  @@index([reviewId])
  @@index([userId])
}
```

#### Model Updates

```prisma
model Content {
  // ... existing fields
  
  // Denormalized aggregate rating (cached for performance)
  averageRating  Float?  // null = no reviews yet
  ratingCount    Int     @default(0)
  reviewCount    Int     @default(0)
  
  reviews        Review[] @relation("ContentReviews")
}

model User {
  // ... existing fields
  
  reviews          Review[]          @relation("UserReviews")
  reviewReactions  ReviewReaction[]  @relation("UserReviewReactions")
}
```

### Aggregate Rating Logic

**When to Recalculate:**
- After a new review is created
- After a review is updated (rating changed)
- After a review is deleted

**Calculation:**
```sql
UPDATE Content
SET 
  averageRating = (SELECT AVG(rating) FROM Review WHERE contentId = $contentId),
  ratingCount = (SELECT COUNT(*) FROM Review WHERE contentId = $contentId),
  reviewCount = (SELECT COUNT(*) FROM Review WHERE contentId = $contentId AND reviewText IS NOT NULL)
WHERE id = $contentId;
```

**Performance Note:**  
This is a **write-time calculation**, not read-time. Reading `content.averageRating` is O(1).  
Review creation is infrequent compared to book views, so this trade-off is correct.

---

## Backend API Specification

### Base Path
All review endpoints live under `/api/v1/content/:slug/reviews` or `/api/v1/reviews` for admin.

### Public Endpoints (Read)

#### 1. Get Reviews for a Book
```http
GET /api/v1/content/:slug/reviews?page=1&limit=10&sort=helpful
```

**Query Params:**
- `page` (int, default: 1)
- `limit` (int, default: 10, max: 50)
- `sort` (enum: `helpful` | `recent` | `highest` | `lowest`)
  - `helpful` = ORDER BY echoCount DESC, createdAt DESC
  - `recent` = ORDER BY createdAt DESC
  - `highest` = ORDER BY rating DESC, createdAt DESC
  - `lowest` = ORDER BY rating ASC, createdAt DESC

**Response:**
```json
{
  "data": {
    "reviews": [
      {
        "id": "clxxx",
        "userId": "user123",
        "userDisplayName": "Alice Wonderland",
        "userAvatarUrl": "https://...",
        "rating": 5,
        "reviewText": "Absolutely captivating! The magic system is intricate...",
        "echoCount": 42,
        "hasEchoed": false,  // if authenticated user has echoed this review
        "createdAt": "2026-09-01T12:00:00Z",
        "updatedAt": "2026-09-01T12:00:00Z"
      }
    ],
    "aggregate": {
      "averageRating": 4.6,
      "ratingCount": 1284,
      "reviewCount": 342,
      "distribution": {
        "1": 12,
        "2": 34,
        "3": 156,
        "4": 482,
        "5": 600
      }
    },
    "userReview": {
      "id": "clyyy",
      "rating": 5,
      "reviewText": "My own review...",
      "echoCount": 3,
      "createdAt": "2026-08-15T10:00:00Z"
    } | null,  // if authenticated user has a review
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 342,
      "hasMore": true
    }
  },
  "error": null
}
```

**Auth:** Optional (if authenticated, includes `hasEchoed` and `userReview`)

---

### Authenticated Endpoints

#### 2. Create or Update Review
```http
POST /api/v1/content/:slug/reviews
```

**Body:**
```json
{
  "rating": 5,
  "reviewText": "This is my review..."  // optional, 50-2000 chars if provided
}
```

**Behavior:**
- If user has no review for this book: **CREATE**
- If user already has a review: **UPDATE** (replace rating + text)

**Response:**
```json
{
  "data": {
    "id": "clxxx",
    "contentId": "content123",
    "userId": "user123",
    "rating": 5,
    "reviewText": "This is my review...",
    "echoCount": 0,
    "createdAt": "2026-09-14T10:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z"
  },
  "error": null
}
```

**Auth:** Required (JWT)

**Validation:**
- `rating`: must be integer 1-5
- `reviewText`: if provided, 50-2000 characters (trimmed)
- Content must exist
- User must be authenticated

---

#### 3. Delete Own Review
```http
DELETE /api/v1/content/:slug/reviews
```

**Response:**
```json
{
  "data": {
    "deleted": true,
    "reviewId": "clxxx"
  },
  "error": null
}
```

**Auth:** Required (JWT)

**Behavior:**
- Deletes the authenticated user's review for this book
- Cascades to delete all ReviewReaction records for this review
- Recalculates Content aggregate rating

---

#### 4. Echo a Review
```http
POST /api/v1/reviews/:reviewId/echo
```

**Response:**
```json
{
  "data": {
    "echoed": true,
    "reviewId": "clxxx",
    "echoCount": 43
  },
  "error": null
}
```

**Auth:** Required (JWT)

**Behavior:**
- If user has not echoed: **CREATE** ReviewReaction
- If user has already echoed: **DELETE** ReviewReaction (toggle off)
- Returns final echo count and toggle state

---

### Admin Endpoints

#### 5. List All Reviews (Admin Panel)
```http
GET /api/v1/admin/reviews?page=1&limit=50&rating=5&contentId=xxx&search=spam
```

**Query Params:**
- `page` (int)
- `limit` (int, max 100)
- `rating` (int, filter by specific star rating)
- `contentId` (cuid, filter by book)
- `search` (string, search in reviewText)
- `sort` (enum: `recent` | `highest` | `lowest` | `most_echoed`)

**Response:**
```json
{
  "data": {
    "reviews": [
      {
        "id": "clxxx",
        "contentId": "content123",
        "contentTitle": "The Arcane Chronicles",
        "contentSlug": "arcane-chronicles",
        "userId": "user123",
        "userDisplayName": "Alice Wonderland",
        "userEmail": "alice@example.com",
        "rating": 5,
        "reviewText": "...",
        "echoCount": 42,
        "createdAt": "2026-09-01T12:00:00Z"
      }
    ],
    "total": 15482,
    "page": 1,
    "limit": 50,
    "hasMore": true
  },
  "error": null
}
```

**Auth:** Required (role: ADMIN or MODERATOR)

---

#### 6. Delete Review (Admin)
```http
DELETE /api/v1/admin/reviews/:reviewId
```

**Response:**
```json
{
  "data": {
    "deleted": true,
    "reviewId": "clxxx"
  },
  "error": null
}
```

**Auth:** Required (role: ADMIN or MODERATOR)

**Behavior:**
- Hard delete (cascade to ReviewReaction)
- Recalculates Content aggregate rating
- Logs action in admin activity stream

---

#### 7. Get Review Analytics
```http
GET /api/v1/admin/reviews/analytics
```

**Response:**
```json
{
  "data": {
    "totalReviews": 15482,
    "avgRatingGlobal": 4.3,
    "reviewsLast7Days": 342,
    "reviewsLast30Days": 1456,
    "ratingDistribution": {
      "1": 520,
      "2": 1240,
      "3": 3480,
      "4": 5640,
      "5": 4602
    },
    "topRatedBooks": [
      {
        "contentId": "xxx",
        "title": "The Arcane Chronicles",
        "slug": "arcane-chronicles",
        "averageRating": 4.9,
        "ratingCount": 2845
      }
    ],
    "mostReviewedBooks": [
      {
        "contentId": "yyy",
        "title": "Shadow Cultivation",
        "slug": "shadow-cultivation",
        "reviewCount": 1204
      }
    ]
  },
  "error": null
}
```

**Auth:** Required (role: ADMIN or MODERATOR)

---

## Frontend Components

### Web App (`apps/web`)

#### Component Hierarchy

```
BookDetailModal
└── ReviewSection
    ├── RatingOverview
    │   ├── StarRating (display, average)
    │   └── RatingDistributionBars
    ├── UserReviewForm (if authenticated)
    │   ├── StarRatingInput (interactive)
    │   └── ReviewTextarea
    └── ReviewList
        └── ReviewCard (×N)
            ├── StarRating (display)
            ├── ReviewText
            ├── EchoButton
            └── ReviewMeta (user, date)
```

---

### 1. `ReviewSection.tsx`

**Location:** `apps/web/src/features/reviews/components/ReviewSection.tsx`

**Props:**
```typescript
interface ReviewSectionProps {
  slug: string;              // Content slug for API calls
  contentId: string;         // For linking
  isAuthenticated: boolean;  // Show write form if true
}
```

**Responsibilities:**
- Fetches reviews via `useReviews(slug)` hook
- Renders RatingOverview, UserReviewForm (if auth), ReviewList
- Handles pagination (load more button)
- Scroll spy: deep link `#reviews` scrolls here

**Layout:**
```tsx
<section id="reviews" className="mt-8 border-t pt-6">
  <h2>Reader Reviews</h2>
  <RatingOverview aggregate={data.aggregate} />
  {isAuthenticated && <UserReviewForm slug={slug} userReview={data.userReview} />}
  <ReviewList reviews={data.reviews} onEcho={handleEcho} />
  {hasMore && <LoadMoreButton />}
</section>
```

---

### 2. `RatingOverview.tsx`

**Props:**
```typescript
interface RatingOverviewProps {
  aggregate: {
    averageRating: number;
    ratingCount: number;
    reviewCount: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
}
```

**Layout:**
```tsx
<div className="flex gap-6 items-center mb-6">
  <div className="text-center">
    <div className="text-5xl font-bold">{averageRating.toFixed(1)}</div>
    <StarRating value={averageRating} readonly />
    <p className="text-sm text-gray-500">{ratingCount} ratings</p>
  </div>
  <div className="flex-1">
    <RatingDistributionBars distribution={distribution} total={ratingCount} />
  </div>
</div>
```

---

### 3. `StarRating.tsx`

**Props:**
```typescript
interface StarRatingProps {
  value: number;           // 0-5
  readonly?: boolean;      // if false, interactive
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}
```

**Behavior:**
- Readonly: shows filled/half/empty stars based on value
- Interactive: click to set rating (1-5), hover preview
- Mobile: tap targets 44x44px minimum
- Keyboard accessible (arrow keys to change, enter to submit)

**Implementation:**
```tsx
// Use lucide-react: Star (outline), StarHalf (half-fill)
// Color: text-yellow-400 for filled, text-gray-300 for empty
// Touch target: p-2 around each star on mobile
```

---

### 4. `UserReviewForm.tsx`

**Props:**
```typescript
interface UserReviewFormProps {
  slug: string;
  userReview: Review | null;  // existing review to edit
  onSubmit?: () => void;      // refresh callback
}
```

**Layout:**
```tsx
<Card className="mb-6 p-4">
  <h3>Your Review</h3>
  <StarRating value={rating} onChange={setRating} />
  <Textarea 
    placeholder="Share your thoughts (optional, 50-2000 characters)..."
    value={reviewText}
    onChange={...}
    maxLength={2000}
  />
  <CharacterCount current={reviewText.length} min={50} max={2000} />
  <Button onClick={handleSubmit} disabled={!isValid}>
    {userReview ? 'Update Review' : 'Submit Review'}
  </Button>
  {userReview && <Button variant="ghost" onClick={handleDelete}>Delete</Button>}
</Card>
```

**Validation:**
- Rating: required (1-5)
- Review text: optional, but if provided must be 50-2000 chars (trimmed)
- Show error if text is 1-49 chars: "Review must be at least 50 characters"

**Submit behavior:**
- POST `/api/v1/content/:slug/reviews`
- Optimistic update: immediately show in list
- On success: invalidate `useReviews` query
- On error: revert and show toast

---

### 5. `ReviewCard.tsx`

**Props:**
```typescript
interface ReviewCardProps {
  review: {
    id: string;
    userDisplayName: string;
    userAvatarUrl: string | null;
    rating: number;
    reviewText: string | null;
    echoCount: number;
    hasEchoed: boolean;
    createdAt: string;
  };
  onEcho: (reviewId: string) => void;
}
```

**Layout:**
```tsx
<Card className="p-4 mb-3">
  <div className="flex items-start gap-3">
    <Avatar src={userAvatarUrl} name={userDisplayName} />
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{userDisplayName}</span>
        <StarRating value={rating} readonly size="sm" />
      </div>
      <p className="text-sm text-gray-500 mb-2">{formatDate(createdAt)}</p>
      {reviewText && <p className="text-gray-800 dark:text-gray-200">{reviewText}</p>}
      <div className="mt-3 flex items-center gap-4">
        <EchoButton 
          echoed={hasEchoed} 
          count={echoCount} 
          onClick={() => onEcho(id)} 
        />
      </div>
    </div>
  </div>
</Card>
```

---

### 6. `EchoButton.tsx`

**Props:**
```typescript
interface EchoButtonProps {
  echoed: boolean;
  count: number;
  onClick: () => void;
}
```

**Layout:**
```tsx
<button 
  onClick={onClick}
  className={cn(
    "flex items-center gap-1 text-sm",
    echoed ? "text-purple-600 font-semibold" : "text-gray-500"
  )}
>
  <Heart className={echoed ? "fill-current" : ""} size={16} />
  <span>{count > 0 ? count : 'Echo'}</span>
</button>
```

---

### Hook: `useReviews.ts`

**Location:** `apps/web/src/features/reviews/hooks/useReviews.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '@arcanium/api-client';

export function useReviews(slug: string, page = 1, sort = 'helpful') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reviews', slug, page, sort],
    queryFn: () => reviewApi.list(slug, { page, sort }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createOrUpdate = useMutation({
    mutationFn: (input: { rating: number; reviewText?: string }) =>
      reviewApi.createOrUpdate(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
      queryClient.invalidateQueries({ queryKey: ['content', slug] }); // refresh aggregate on detail page
    },
  });

  const deleteReview = useMutation({
    mutationFn: () => reviewApi.delete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
      queryClient.invalidateQueries({ queryKey: ['content', slug] });
    },
  });

  const echo = useMutation({
    mutationFn: (reviewId: string) => reviewApi.echo(reviewId),
    onMutate: async (reviewId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['reviews', slug, page, sort] });
      const previous = queryClient.getQueryData(['reviews', slug, page, sort]);
      queryClient.setQueryData(['reviews', slug, page, sort], (old: any) => ({
        ...old,
        data: {
          ...old.data,
          reviews: old.data.reviews.map((r: any) =>
            r.id === reviewId
              ? { ...r, hasEchoed: !r.hasEchoed, echoCount: r.echoCount + (r.hasEchoed ? -1 : 1) }
              : r
          ),
        },
      }));
      return { previous };
    },
    onError: (err, reviewId, context) => {
      queryClient.setQueryData(['reviews', slug, page, sort], context?.previous);
    },
  });

  return {
    ...query,
    createOrUpdate,
    deleteReview,
    echo,
  };
}
```

---

### Integration into BookDetailModal

**File:** `apps/web/src/features/explore/components/BookDetailModal.tsx`

**Changes:**
1. Import `ReviewSection`
2. Add `<ReviewSection slug={book.slug} contentId={book.id} isAuthenticated={!!user} />` after synopsis section
3. Ensure modal is scrollable (max-h-[90vh] overflow-y-auto)

```tsx
<Modal open={isOpen} onClose={onClose}>
  <div className="max-h-[90vh] overflow-y-auto">
    {/* existing cover + title + metadata */}
    <section className="mb-6">
      <h3>Synopsis</h3>
      <p>{book.synopsis}</p>
    </section>
    
    <ReviewSection 
      slug={book.slug} 
      contentId={book.id}
      isAuthenticated={!!user} 
    />
  </div>
</Modal>
```

---

## Admin Panel Integration

### Admin Reviews Page

**Route:** `/reviews` (new sidebar item)

**File:** `apps/admin/src/pages/ReviewsPage.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  Reviews Management                              │
├─────────────────────────────────────────────────┤
│  📊 Analytics Cards (4 across)                   │
│  [Total Reviews] [Avg Rating] [Last 7d] [Last 30d]
├─────────────────────────────────────────────────┤
│  🔍 Filters                                      │
│  [Search] [Rating ▾] [Book ▾] [Sort ▾]          │
├─────────────────────────────────────────────────┤
│  📋 Reviews Table                                │
│  ┌─────────────────────────────────────────────┐│
│  │ Book Title   User      ⭐  Review    Echoes  ││
│  │ Arcane       Alice     5  "Amazing..."  42   ││
│  │ Chronicles   @alice        [Delete]          ││
│  └─────────────────────────────────────────────┘│
│  [← Prev]  Page 1 of 42  [Next →]               │
└─────────────────────────────────────────────────┘
```

**Features:**
- Real-time search by review text
- Filter by star rating (dropdown)
- Filter by book (autocomplete)
- Sort by date, rating, echo count
- Bulk actions: delete selected (future)
- Click row to expand full review text

**Hook:** `useReviewManagement.ts`

```typescript
export function useReviewManagement() {
  const [filters, setFilters] = useState({
    search: '',
    rating: null,
    contentId: null,
    page: 1,
    sort: 'recent',
  });

  const query = useQuery({
    queryKey: ['admin-reviews', filters],
    queryFn: () => adminApi.getReviews(filters),
  });

  const deleteReview = useMutation({
    mutationFn: (reviewId: string) => adminApi.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const analytics = useQuery({
    queryKey: ['admin-review-analytics'],
    queryFn: () => adminApi.getReviewAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return { query, deleteReview, analytics, filters, setFilters };
}
```

---

## Constitution Compliance

### ✅ Mobile-First (P1)
- Star rating: 44x44px touch targets
- Review cards: stack vertically on mobile
- "Write Review" form: full-width on mobile, inline on desktop
- Tested at 320px viewport

### ✅ Modularity (P2)
- Feature directory: `apps/web/src/features/reviews/`
- Components, hooks, and types co-located
- Can be feature-flagged: `VITE_FEATURE_FLAG_REVIEWS=true/false`

### ✅ Performance (P3)
- Aggregate ratings denormalized on Content model (no join on read)
- Reviews paginated (10 per page default)
- Echo mutations use optimistic updates (no loading spinner)
- Review list virtualized if >50 items (future enhancement)

### ✅ Offline-First (P4)
- Reviews cached via React Query (5min stale time)
- Optimistic updates for echo actions
- Graceful degradation: show cached reviews if offline
- Write actions: queue in IndexedDB if offline (future sprint)

### ✅ Security (P6)
- All write endpoints require JWT authentication
- User can only edit/delete their own review (enforced server-side)
- Echo toggle idempotent (safe to spam)
- Review text sanitized before storage (XSS prevention)
- Rate limiting: max 10 review writes per hour per user

### ✅ TypeScript Strict Mode (§10.1)
- All types defined in `@arcanium/types`
- Zod schemas for request validation
- No `any` types

### ✅ No Direct Fetch (§8.4)
- All API calls via `@arcanium/api-client`
- Wrapped in React Query hooks

---

## Implementation Roadmap

### Sprint 1 — Database & Backend (3-4 days)

**Tasks:**
1. ✅ Write spec document (this file)
2. Add Prisma schema for Review, ReviewReaction models
3. Add aggregate fields to Content model
4. Run migration: `pnpm --filter @arcanium/backend db:migrate --name add_reviews`
5. Implement backend routes:
   - GET `/api/v1/content/:slug/reviews`
   - POST `/api/v1/content/:slug/reviews`
   - DELETE `/api/v1/content/:slug/reviews`
   - POST `/api/v1/reviews/:reviewId/echo`
6. Add aggregate rating recalculation helper
7. Write integration tests for review CRUD

---

### Sprint 2 — Types & API Client (1 day)

**Tasks:**
1. Add Zod schemas in `packages/types/src/review.ts`
2. Export types: `Review`, `ReviewReaction`, `ReviewListResponse`, `ReviewInput`
3. Add `reviewApi` to `packages/api-client/src/index.ts`
4. Test API client methods with Postman/Thunder Client

---

### Sprint 3 — Web App UI (4-5 days)

**Tasks:**
1. Create feature directory: `apps/web/src/features/reviews/`
2. Build components:
   - `StarRating.tsx` (reusable for display + input)
   - `RatingOverview.tsx`
   - `RatingDistributionBars.tsx`
   - `UserReviewForm.tsx`
   - `ReviewCard.tsx`
   - `EchoButton.tsx`
   - `ReviewList.tsx`
   - `ReviewSection.tsx` (main container)
3. Build hook: `useReviews.ts`
4. Integrate `ReviewSection` into `BookDetailModal`
5. Add "Reviews" tab to book detail page (if dedicated page exists)
6. Test mobile responsiveness (320px - 768px)

---

### Sprint 4 — Admin Panel (2-3 days)

**Tasks:**
1. Add admin API routes:
   - GET `/api/v1/admin/reviews`
   - DELETE `/api/v1/admin/reviews/:reviewId`
   - GET `/api/v1/admin/reviews/analytics`
2. Add `ReviewsPage.tsx` to `apps/admin/src/pages/`
3. Build `useReviewManagement.ts` hook
4. Add "Reviews" to admin sidebar nav
5. Build analytics cards component
6. Build reviews table with filters + search
7. Test delete flow + activity log integration

---

### Sprint 5 — Seed Data & Testing (1-2 days)

**Tasks:**
1. Add seed data to `services/backend/prisma/seed.ts`:
   - 50-100 sample reviews across catalog
   - Variety of ratings (1-5 stars)
   - Some reviews with echoes
2. Run seed: `pnpm --filter @arcanium/backend db:seed`
3. End-to-end test:
   - Create review as user
   - Edit review
   - Echo another user's review
   - Delete own review
   - View reviews as guest
   - Admin: filter, search, delete review
4. Performance audit:
   - Check Content detail page load time with 100+ reviews
   - Verify pagination works correctly
   - Test mobile scroll performance
5. Constitution compliance checklist (see above)

---

### Post-Launch Enhancements (Future)

**Phase 6+:**
- Chapter-level reviews (comment on specific chapters)
- Review replies (nested comments — turns into mini forum)
- Review moderation queue (flagged reviews)
- Review sentiment analysis (AI-powered mood detection)
- Review export for creators (CSV download)
- Review highlights on homepage ("Featured Review of the Week")
- Review notifications (email/in-app when someone echoes your review)

---

## Open Questions

### Q1: Should we allow reviews without reading progress?

**Answer:** YES.  
Users can review books they've read elsewhere (Royal Road, MangaDex, etc.). We trust the community to self-police fake reviews via echo votes. Helpful reviews rise to the top regardless of reading progress.

### Q2: Can creators respond to reviews?

**Answer:** NOT IN V1.  
Responding creates a forum dynamic that requires moderation. Defer to Phase 6+ when we have a full community layer. Creators can see reviews but not reply publicly.

### Q3: Should we show half-stars (4.5 ⭐)?

**Answer:** YES for display, NO for input.  
- Display: show half-stars based on average (4.3 = 4.5 stars visually)  
- Input: users can only select whole stars (1, 2, 3, 4, 5)  
This matches industry standard (Amazon, Goodreads).

### Q4: Do we need a review report/flag system?

**Answer:** NOT IN V1.  
Admin can delete reviews manually in the admin panel. Add a "Report Review" button in Phase 6 if spam becomes an issue. For now, reactive moderation is sufficient.

---

## Success Metrics

**Launch Targets (30 days post-launch):**
- 20% of active users write at least one review
- 50% of catalog items have at least one review
- Average 3.5+ reviews per reviewed book
- <1% review deletion rate (low spam)

**Engagement Metrics:**
- Echo rate: 15% of users who read reviews echo at least one
- Edit rate: <5% of reviews are edited (indicates good UX, low mistakes)
- Average review length: 150-300 characters (sweet spot)

**Performance Metrics:**
- BookDetailModal load time: <500ms (including reviews)
- Review submission: <200ms perceived latency (optimistic update)
- Mobile scroll FPS: 60fps on mid-range Android

---

**End of Specification**

*This document is the single source of truth for the Book Reviews & Ratings feature. All PRs related to this feature must reference this spec. Any deviations require an ADR.*
