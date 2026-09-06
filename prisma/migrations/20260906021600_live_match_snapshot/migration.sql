-- CreateTable
CREATE TABLE "LiveMatch" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "state" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveMatch_campaignId_updatedAt_idx" ON "LiveMatch"("campaignId", "updatedAt");

-- AddForeignKey
ALTER TABLE "LiveMatch" ADD CONSTRAINT "LiveMatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMatch" ADD CONSTRAINT "LiveMatch_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
