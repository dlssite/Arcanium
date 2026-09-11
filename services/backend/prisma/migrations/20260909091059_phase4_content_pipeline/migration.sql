/*
  Warnings:

  - Added the required column `updatedAt` to the `Chapter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('SCRAPED', 'CREATOR_UPLOAD', 'ADMIN_UPLOAD');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'VERIFIED_WRITER', 'MODERATOR', 'ADMIN');

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "bodyText" TEXT,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "wordCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "sourceUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'SCRAPED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "Chapter_contentId_isPublished_idx" ON "Chapter"("contentId", "isPublished");

-- CreateIndex
CREATE INDEX "Content_source_idx" ON "Content"("source");

-- CreateIndex
CREATE INDEX "Content_creatorId_idx" ON "Content"("creatorId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
