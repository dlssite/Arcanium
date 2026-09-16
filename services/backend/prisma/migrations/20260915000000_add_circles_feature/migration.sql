-- ============================================================================
-- Migration: add_circles_feature
-- Extends ReadingCircle, CircleMember, CircleSession with new columns and
-- adds CirclePost, CirclePostEcho, CirclePostReply, CircleJoinRequest models.
-- Also adds new enum types and AppConfig / FeatureFlag seed rows.
--
-- All DDL uses IF NOT EXISTS / DO NOTHING — fully idempotent, zero data loss.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: New enum types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "CircleVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CircleMemberRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CircleMemberStatus" AS ENUM ('ACTIVE', 'PENDING', 'BANNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CirclePostType" AS ENUM ('MARGINALIA', 'DISCUSSION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CircleJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: Extend ReadingCircle
-- ---------------------------------------------------------------------------

-- Drop the old unique constraint on circleId if it existed (old CircleSession had @@unique([circleId]))
ALTER TABLE "CircleSession" DROP CONSTRAINT IF EXISTS "CircleSession_circleId_key";

ALTER TABLE "ReadingCircle"
    ADD COLUMN IF NOT EXISTS "description"   VARCHAR(500),
    ADD COLUMN IF NOT EXISTS "coverColor"    TEXT NOT NULL DEFAULT 'bg-purple-500',
    ADD COLUMN IF NOT EXISTS "visibility"    "CircleVisibility" NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN IF NOT EXISTS "isFeatured"    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "isArchived"    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "ownerId"       TEXT;

-- Back-fill ownerId with a placeholder (NULL allowed temporarily) then we
-- enforce NOT NULL only after we know there is data or the table is empty.
-- For a fresh DB or dev DB with no circle rows this is a no-op.
-- We do NOT set NOT NULL here because existing rows may have no owner yet.
-- The application layer enforces ownership on all new writes.

CREATE INDEX IF NOT EXISTS "ReadingCircle_isFeatured_featuredOrder_idx"
    ON "ReadingCircle"("isFeatured", "featuredOrder");
CREATE INDEX IF NOT EXISTS "ReadingCircle_isArchived_idx"
    ON "ReadingCircle"("isArchived");
CREATE INDEX IF NOT EXISTS "ReadingCircle_ownerId_idx"
    ON "ReadingCircle"("ownerId");

-- Foreign key from ReadingCircle.ownerId → User.id
DO $$ BEGIN
  ALTER TABLE "ReadingCircle"
    ADD CONSTRAINT "ReadingCircle_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Step 3: Extend CircleMember
-- ---------------------------------------------------------------------------

ALTER TABLE "CircleMember"
    ADD COLUMN IF NOT EXISTS "role"   "CircleMemberRole"   NOT NULL DEFAULT 'MEMBER',
    ADD COLUMN IF NOT EXISTS "status" "CircleMemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- ---------------------------------------------------------------------------
-- Step 4: Extend CircleSession
-- ---------------------------------------------------------------------------

ALTER TABLE "CircleSession"
    ADD COLUMN IF NOT EXISTS "bookTitle"   TEXT,
    ADD COLUMN IF NOT EXISTS "chapterHint" TEXT,
    ADD COLUMN IF NOT EXISTS "isActive"    BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "endedAt"     TIMESTAMP(3);

-- The old model had @@unique([circleId]) — we replaced it with a non-unique index
-- because multiple sessions per circle are now allowed (archived ones).
CREATE INDEX IF NOT EXISTS "CircleSession_circleId_isActive_idx"
    ON "CircleSession"("circleId", "isActive");

-- ---------------------------------------------------------------------------
-- Step 5: Create CirclePost
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CirclePost" (
    "id"         TEXT NOT NULL,
    "circleId"   TEXT NOT NULL,
    "authorId"   TEXT NOT NULL,
    "type"       "CirclePostType" NOT NULL,
    -- MARGINALIA fields
    "quote"      TEXT,
    "chapter"    TEXT,
    "reflection" TEXT,
    -- DISCUSSION fields
    "title"      TEXT,
    "body"       TEXT,
    -- Counters
    "echoCount"  INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned"   BOOLEAN NOT NULL DEFAULT false,
    "isRemoved"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CirclePost_circleId_createdAt_idx"
    ON "CirclePost"("circleId", "createdAt");
CREATE INDEX IF NOT EXISTS "CirclePost_circleId_isRemoved_idx"
    ON "CirclePost"("circleId", "isRemoved");
CREATE INDEX IF NOT EXISTS "CirclePost_authorId_idx"
    ON "CirclePost"("authorId");

DO $$ BEGIN
  ALTER TABLE "CirclePost"
    ADD CONSTRAINT "CirclePost_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "ReadingCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CirclePost"
    ADD CONSTRAINT "CirclePost_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Step 6: Create CirclePostEcho (unique-per-user toggle — mirrors ReviewReaction)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CirclePostEcho" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePostEcho_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CirclePostEcho_postId_userId_key"
    ON "CirclePostEcho"("postId", "userId");
CREATE INDEX IF NOT EXISTS "CirclePostEcho_postId_idx"
    ON "CirclePostEcho"("postId");
CREATE INDEX IF NOT EXISTS "CirclePostEcho_userId_idx"
    ON "CirclePostEcho"("userId");

DO $$ BEGIN
  ALTER TABLE "CirclePostEcho"
    ADD CONSTRAINT "CirclePostEcho_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CirclePostEcho"
    ADD CONSTRAINT "CirclePostEcho_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Step 7: Create CirclePostReply
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CirclePostReply" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePostReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CirclePostReply_postId_createdAt_idx"
    ON "CirclePostReply"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "CirclePostReply_authorId_idx"
    ON "CirclePostReply"("authorId");

DO $$ BEGIN
  ALTER TABLE "CirclePostReply"
    ADD CONSTRAINT "CirclePostReply_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CirclePostReply"
    ADD CONSTRAINT "CirclePostReply_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Step 8: Create CircleJoinRequest
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CircleJoinRequest" (
    "id"         TEXT NOT NULL,
    "circleId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "message"    VARCHAR(300),
    "status"     "CircleJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CircleJoinRequest_circleId_userId_key"
    ON "CircleJoinRequest"("circleId", "userId");
CREATE INDEX IF NOT EXISTS "CircleJoinRequest_circleId_status_idx"
    ON "CircleJoinRequest"("circleId", "status");
CREATE INDEX IF NOT EXISTS "CircleJoinRequest_userId_idx"
    ON "CircleJoinRequest"("userId");

DO $$ BEGIN
  ALTER TABLE "CircleJoinRequest"
    ADD CONSTRAINT "CircleJoinRequest_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "ReadingCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CircleJoinRequest"
    ADD CONSTRAINT "CircleJoinRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Step 9: AppConfig — circle rank threshold
-- ---------------------------------------------------------------------------

INSERT INTO "AppConfig" ("key", "value", "updatedAt")
VALUES ('circle_min_rank_level', '3', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 10: FeatureFlag — FEATURE_FLAG_CIRCLES (disabled by default)
-- ---------------------------------------------------------------------------

INSERT INTO "FeatureFlag" ("key", "name", "description", "category", "enabled", "rolloutPct", "updatedAt")
VALUES (
    'FEATURE_FLAG_CIRCLES',
    'Reading Circles',
    'Enables the Reading Circles community feature — creation, joining, posting, replies, and the /circles directory.',
    'CORE_READER',
    false,
    0,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
