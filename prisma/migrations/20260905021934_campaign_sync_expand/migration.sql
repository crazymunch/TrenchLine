-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "framework" TEXT,
ADD COLUMN     "houseRules" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TerritoryNode" ADD COLUMN     "perkSource" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "CampaignSyncOp" (
    "opId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSyncOp_pkey" PRIMARY KEY ("opId")
);

-- CreateIndex
CREATE INDEX "CampaignSyncOp_campaignId_appliedAt_idx" ON "CampaignSyncOp"("campaignId", "appliedAt");

-- AddForeignKey
ALTER TABLE "CampaignSyncOp" ADD CONSTRAINT "CampaignSyncOp_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
