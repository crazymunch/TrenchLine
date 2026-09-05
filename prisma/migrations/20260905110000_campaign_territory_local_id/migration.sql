-- AlterTable
ALTER TABLE "TerritoryNode" ADD COLUMN     "localId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryNode_campaignId_localId_key" ON "TerritoryNode"("campaignId", "localId");
