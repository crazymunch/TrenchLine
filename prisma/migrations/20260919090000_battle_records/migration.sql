-- CHRON-2: the Chronicle of Battles, shared.
--
-- Purely additive: two new tables and one new enum type. Nothing existing is
-- altered, so this applies to a live database with no backfill and no window
-- in which the running build sees a shape it does not expect.

-- CreateEnum
CREATE TYPE "BattleVisibility" AS ENUM ('PRIVATE', 'CAMPAIGN', 'PUBLIC');

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "visibility" "BattleVisibility" NOT NULL DEFAULT 'CAMPAIGN',
    "endedAt" TIMESTAMP(3) NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "turns" INTEGER NOT NULL,
    "sides" JSONB NOT NULL,
    "deeds" JSONB NOT NULL DEFAULT '[]',
    "coalitionTotals" JSONB,
    "weather" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "warbandId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Battle_campaignId_endedAt_idx" ON "Battle"("campaignId", "endedAt");

-- CreateIndex
CREATE INDEX "Battle_ownerId_endedAt_idx" ON "Battle"("ownerId", "endedAt");

-- CreateIndex
CREATE INDEX "Battle_visibility_endedAt_idx" ON "Battle"("visibility", "endedAt");

-- CreateIndex
CREATE INDEX "BattleParticipant_userId_idx" ON "BattleParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_warbandId_key" ON "BattleParticipant"("battleId", "warbandId");

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL, not CASCADE: deleting a campaign must not delete the record of
-- games that were played in it. The battle survives, campaign-less.
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL: an account closing removes their claim on a battle, not the fact
-- that a side was on the table.
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
