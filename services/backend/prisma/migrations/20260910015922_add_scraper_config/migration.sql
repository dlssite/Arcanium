-- CreateEnum
CREATE TYPE "ScraperStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'FAILED');

-- CreateEnum
CREATE TYPE "SelectorType" AS ENUM ('CHEERIO', 'REST', 'READABILITY');

-- CreateTable
CREATE TABLE "ScraperConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetDomain" TEXT NOT NULL,
    "selectorType" "SelectorType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requestDelayMs" INTEGER NOT NULL DEFAULT 1000,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" "ScraperStatus",
    "totalCrawledAllTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScraperConfig_targetDomain_key" ON "ScraperConfig"("targetDomain");

-- CreateIndex
CREATE INDEX "ScraperConfig_enabled_idx" ON "ScraperConfig"("enabled");
