-- SH-1: a public share page for a warband.
--
-- One nullable column and one unique index. Purely additive: every existing row
-- gets NULL, which is "not shared", so nothing is published by the migration
-- itself and there is no window in which the running build sees a shape it does
-- not expect.
--
-- Nullable AND unique on purpose. Postgres treats NULLs as distinct under a
-- unique index, so any number of rosters may be unshared while no two shared
-- rosters can answer to one token — which is the property the share page relies
-- on, because a token is what a reader presents instead of a session.

-- AlterTable
ALTER TABLE "Warband" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Warband_shareToken_key" ON "Warband"("shareToken");
