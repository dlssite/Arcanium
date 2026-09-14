# Book Reviews & Ratings — Database Migration Guide

> **Date:** September 2026  
> **Migration Name:** `add_reviews_and_ratings`  
> **Status:** Ready to apply

---

## Overview

This migration adds the book reviews and ratings feature to the database. It introduces two new models (`Review` and `ReviewReaction`) and extends the existing `Content` and `User` models.

---

## Schema Changes

### 1. New Models

#### Review
- Stores user ratings (1-5 stars) and optional review text
- One review per user per book (enforced by unique constraint)
- Tracks echo count (helpfulness metric)
- Cascades on delete if content or user is deleted

#### ReviewReaction
- Stores "echo" reactions (like/helpful votes) on reviews
- One echo per user per review (toggle on/off)
- Cascades on delete if review or user is deleted

### 2. Content Model Updates

**New fields:**
- `averageRating` (Float?, nullable) — cached aggregate rating
- `ratingCount` (Int, default 0) — total number of ratings
- `reviewCount` (Int, default 0) — total number of written reviews (excludes rating-only)

**New relation:**
- `reviews` → Review[] @relation("ContentReviews")

**New index:**
- `@@index([averageRating])` — for sorting catalog by rating

### 3. User Model Updates

**New relations:**
- `reviews` → Review[] @relation("UserReviews")
- `reviewReactions` → ReviewReaction[] @relation("UserReviewReactions")

---

## Running the Migration

### Step 1: Generate Migration

From the repository root, run:

```bash
pnpm --filter @arcanium/backend db:migrate --name add_reviews_and_ratings
```

This will:
1. Generate SQL migration files in `services/backend/prisma/migrations/`
2. Apply the migration to your local database
3. Regenerate the Prisma Client with new types

### Step 2: Verify Migration

Check that the migration was applied successfully:

```bash
pnpm --filter @arcanium/backend db:studio
```

Open Prisma Studio and verify:
- `Review` table exists with columns: id, contentId, userId, rating, reviewText, echoCount, createdAt, updatedAt
- `ReviewReaction` table exists with columns: id, reviewId, userId, createdAt
- `Content` table has new columns: averageRating, ratingCount, reviewCount
- All foreign keys and unique constraints are in place

### Step 3: Test Rollback (Optional)

To test the down migration (rollback):

```bash
# CAUTION: This will destroy review data
pnpm --filter @arcanium/backend prisma migrate reset
```

Only do this in development! Production rollbacks require careful planning.

---

## Expected SQL (PostgreSQL)

The migration will generate SQL similar to:

```sql
-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "echoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReaction" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReaction_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Content" ADD COLUMN "averageRating" DOUBLE PRECISION,
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Review_contentId_createdAt_idx" ON "Review"("contentId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Review_contentId_userId_key" ON "Review"("contentId", "userId");

-- CreateIndex
CREATE INDEX "ReviewReaction_reviewId_idx" ON "ReviewReaction"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewReaction_userId_idx" ON "ReviewReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReaction_reviewId_userId_key" ON "ReviewReaction"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "Content_averageRating_idx" ON "Content"("averageRating");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReaction" ADD CONSTRAINT "ReviewReaction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReaction" ADD CONSTRAINT "ReviewReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Data Integrity Considerations

### Cascade Delete Behavior

- **If a Content is deleted:** All its reviews and their echoes are deleted (CASCADE)
- **If a User is deleted:** All their reviews and echoes are deleted (CASCADE)
- **If a Review is deleted:** All its echoes are deleted (CASCADE)

### Denormalization Trade-offs

The `Content.averageRating`, `ratingCount`, and `reviewCount` fields are **denormalized** for performance:

**Pros:**
- O(1) read time — no JOIN or aggregation on every catalog query
- Book cards can show ratings without complex queries
- Sorting by rating is fast (indexed)

**Cons:**
- Must be recalculated on every review write operation
- Potential for stale data if background job fails

**Mitigation:**
- Recalculation happens in the same transaction as review write
- Background job can resync all Content ratings weekly as a safety net

---

## Post-Migration Checklist

- [ ] Migration applied without errors
- [ ] Prisma Client regenerated (`pnpm --filter @arcanium/backend prisma generate`)
- [ ] Review table exists in Prisma Studio
- [ ] ReviewReaction table exists in Prisma Studio
- [ ] Content model has new aggregate fields
- [ ] All indexes created correctly
- [ ] Foreign keys enforced (check with `\d+ Review` in psql)
- [ ] Unique constraints working (try inserting duplicate review — should fail)
- [ ] Backend types updated (check `node_modules/.prisma/client/index.d.ts`)

---

## Troubleshooting

### Error: "Unique constraint violation"

If you see this during migration, it means you already have a `Review` or `ReviewReaction` table in your database (possibly from a previous test).

**Solution:**
```bash
# Drop the conflicting tables manually
pnpm --filter @arcanium/backend prisma db push --force-reset
# Then re-run the migration
pnpm --filter @arcanium/backend db:migrate --name add_reviews_and_ratings
```

### Error: "DATABASE_URL not found"

Make sure your `.env` file in `services/backend/` has:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/arcanium"
DIRECT_URL="postgresql://user:password@localhost:5432/arcanium"
```

### Error: "Column already exists"

This means you partially applied the migration. Reset and re-apply:
```bash
pnpm --filter @arcanium/backend prisma migrate reset
pnpm --filter @arcanium/backend db:migrate --name add_reviews_and_ratings
```

---

## Next Steps

After the migration succeeds:

1. **Update seed data** — Add sample reviews to `services/backend/prisma/seed.ts`
2. **Build API endpoints** — Implement review CRUD in `services/backend/src/routes/`
3. **Update API client** — Add `reviewApi` to `packages/api-client`
4. **Build UI components** — Create `apps/web/src/features/reviews/`

---

**End of Migration Guide**

*This migration is reversible. Keep a backup of production data before applying to staging/prod.*
