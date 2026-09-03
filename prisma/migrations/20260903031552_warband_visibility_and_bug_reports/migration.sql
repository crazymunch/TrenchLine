-- Expand step: additive only, so the running code tolerates it.
--
-- `visibility` defaults to PRIVATE and every EXISTING row therefore
-- backfills to PRIVATE. That is deliberate. The directory used to show
-- every roster that had ever synced to the cloud — nobody opted in, and
-- the response carried the owner's email address with it. Backfilling to
-- PUBLIC would preserve exactly that non-consensual publication, so the
-- directory starts empty and fills as people choose to publish.

-- CreateEnum
CREATE TYPE "WarbandVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- AlterTable
ALTER TABLE "Warband" ADD COLUMN     "visibility" "WarbandVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "area" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reporterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

