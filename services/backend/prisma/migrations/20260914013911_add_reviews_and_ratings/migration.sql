-- ============================================================================
-- Migration: add_reviews_and_ratings
-- Adds Review and ReviewReaction models, plus denormalized aggregate columns
-- on Content for efficient rating display without JOIN overhead.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Add denormalized aggregate columns to Content
-- ---------------------------------------------------------------------------

ALTER TABLE "Content"
    ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "ratingCount"   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "reviewCount"   INTEGER NOT NULL DEFAULT 0;

-- Index for sorting/filtering by average rating
CREATE INDEX IF NOT EXISTS "Content_averageRating_idx" ON "Content"("averageRating");

-- ---------------------------------------------------------------------------
-- Step 2: Create Review table
-- ---------------------------------------------------------------------------

CREATE TABLE "Review" (
    "id"         TEXT NOT NULL,
    "contentId"  TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "rating"     INTEGER NOT NULL,
    "reviewText" TEXT,
    "echoCount"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- 1 review per user per book (can be updated, never duplicated)
CREATE UNIQUE INDEX "Review_contentId_userId_key" ON "Review"("contentId", "userId");

-- Efficient listing: recent reviews for a book
CREATE INDEX "Review_contentId_createdAt_idx" ON "Review"("contentId", "createdAt");

-- Admin filtering and analytics
CREATE INDEX "Review_userId_idx"  ON "Review"("userId");
CREATE INDEX "Review_rating_idx"  ON "Review"("rating");

-- Foreign keys
ALTER TABLE "Review"
    ADD CONSTRAINT "Review_contentId_fkey"
        FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "Review_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Step 3: Create ReviewReaction table (echo/un-echo a review)
-- ---------------------------------------------------------------------------

CREATE TABLE "ReviewReaction" (
    "id"        TEXT NOT NULL,
    "reviewId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReaction_pkey" PRIMARY KEY ("id")
);

-- 1 echo per user per review (toggle semantics)
CREATE UNIQUE INDEX "ReviewReaction_reviewId_userId_key" ON "ReviewReaction"("reviewId", "userId");

CREATE INDEX "ReviewReaction_reviewId_idx" ON "ReviewReaction"("reviewId");
CREATE INDEX "ReviewReaction_userId_idx"   ON "ReviewReaction"("userId");

-- Foreign keys
ALTER TABLE "ReviewReaction"
    ADD CONSTRAINT "ReviewReaction_reviewId_fkey"
        FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ReviewReaction_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
