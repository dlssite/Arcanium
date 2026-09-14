-- Add totalXp to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalXp" INTEGER NOT NULL DEFAULT 0;

-- XP audit log
CREATE TABLE IF NOT EXISTS "XpEvent" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "source"    TEXT NOT NULL,
    "amount"    INTEGER NOT NULL,
    "meta"      JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "XpEvent"
    ADD CONSTRAINT "XpEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "XpEvent_userId_source_idx"    ON "XpEvent"("userId", "source");

-- Admin-managed rank definitions
CREATE TABLE IF NOT EXISTS "RankDefinition" (
    "id"          TEXT NOT NULL,
    "level"       INTEGER NOT NULL,
    "title"       TEXT NOT NULL,
    "xpRequired"  INTEGER NOT NULL,
    "icon"        TEXT NOT NULL DEFAULT 'Scroll',
    "colorClass"  TEXT NOT NULL DEFAULT 'text-stone-500',
    "description" TEXT,
    "enabled"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RankDefinition_level_key" ON "RankDefinition"("level");
CREATE INDEX IF NOT EXISTS "RankDefinition_level_idx"   ON "RankDefinition"("level");
