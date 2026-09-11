-- CreateTable
CREATE TABLE "ReadingCircle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "focusTitle" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleSession" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "activeNow" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginaliaPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bookTitle" TEXT NOT NULL,
    "chapter" TEXT,
    "quote" TEXT NOT NULL,
    "reflection" TEXT NOT NULL,
    "echoCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginaliaPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityChallenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetPages" INTEGER NOT NULL,
    "completedPages" INTEGER NOT NULL DEFAULT 0,
    "badgeReward" TEXT NOT NULL,
    "totalScholars" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingCircle_isPublic_idx" ON "ReadingCircle"("isPublic");

-- CreateIndex
CREATE INDEX "CircleMember_circleId_idx" ON "CircleMember"("circleId");

-- CreateIndex
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleSession_circleId_key" ON "CircleSession"("circleId");

-- CreateIndex
CREATE INDEX "MarginaliaPost_authorId_idx" ON "MarginaliaPost"("authorId");

-- CreateIndex
CREATE INDEX "MarginaliaPost_createdAt_idx" ON "MarginaliaPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityChallenge_endsAt_idx" ON "CommunityChallenge"("endsAt");

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "ReadingCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleSession" ADD CONSTRAINT "CircleSession_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "ReadingCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarginaliaPost" ADD CONSTRAINT "MarginaliaPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
