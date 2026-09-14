-- Add bio field to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" VARCHAR(300);

-- Create DefaultAvatar table
CREATE TABLE IF NOT EXISTS "DefaultAvatar" (
    "id"        TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "label"     TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled"   BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefaultAvatar_pkey" PRIMARY KEY ("id")
);

-- Index used by the public list query (enabled avatars ordered by sortOrder)
CREATE INDEX IF NOT EXISTS "DefaultAvatar_enabled_sortOrder_idx" ON "DefaultAvatar"("enabled", "sortOrder");
