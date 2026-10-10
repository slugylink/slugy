-- CreateEnum
-- Additive migration: existing conversions and click IDs are retained.
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "CampaignCostModel" AS ENUM ('manual', 'cpc', 'cpm', 'cpa');

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "campaignId" TEXT;

-- AlterTable
ALTER TABLE "analytics" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualityScore" INTEGER;

-- AlterTable
ALTER TABLE "shared_analytics" ADD COLUMN     "showCost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showRevenue" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "lead_events" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "traffic_sources" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL,
    "utmMedium" TEXT NOT NULL,
    "costImportEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "traffic_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',
    "trafficSourceId" TEXT,
    "costModel" "CampaignCostModel" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shareToken" TEXT,
    "showRevenue" BOOLEAN NOT NULL DEFAULT false,
    "showCost" BOOLEAN NOT NULL DEFAULT false,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_costs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend" DECIMAL(18,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "campaign_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_shareToken_key" ON "campaigns"("shareToken");

-- CreateIndex
CREATE INDEX "campaigns_workspaceId_status_idx" ON "campaigns"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_workspaceId_slug_key" ON "campaigns"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_costs_campaignId_date_currency_source_key" ON "campaign_costs"("campaignId", "date", "currency", "source");

-- CreateIndex
CREATE INDEX "analytics_campaignId_clickedAt_idx" ON "analytics"("campaignId", "clickedAt");

-- CreateIndex
CREATE INDEX "lead_events_campaignId_createdAt_idx" ON "lead_events"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_trafficSourceId_fkey" FOREIGN KEY ("trafficSourceId") REFERENCES "traffic_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_costs" ADD CONSTRAINT "campaign_costs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "traffic_sources" ("id", "provider", "name", "utmSource", "utmMedium") VALUES
('google', 'google', 'Google', 'google', 'cpc'),
('meta', 'meta', 'Meta', 'facebook', 'paid_social'),
('tiktok', 'tiktok', 'TikTok', 'tiktok', 'paid_social'),
('email', 'email', 'Email', 'email', 'email'),
('affiliate', 'affiliate', 'Affiliate', 'affiliate', 'referral'),
('direct', 'direct', 'Direct', 'direct', 'none'),
('qr', 'qr', 'QR', 'qr', 'offline');

-- Preserve exact UTM names. Hash suffixes prevent slug normalization collisions.
INSERT INTO "campaigns" ("id", "workspaceId", "name", "slug", "createdAt", "updatedAt")
SELECT 'utm_' || md5("workspaceId" || ':' || "utm_campaign"), "workspaceId", "utm_campaign",
  left(trim(both '-' from regexp_replace(lower("utm_campaign"), '[^a-z0-9]+', '-', 'g')), 70)
    || '-' || md5("utm_campaign"), min("createdAt"), CURRENT_TIMESTAMP
FROM "links" WHERE "utm_campaign" IS NOT NULL AND trim("utm_campaign") <> ''
GROUP BY "workspaceId", "utm_campaign";

UPDATE "links" l SET "campaignId" = c.id FROM "campaigns" c
WHERE c."workspaceId" = l."workspaceId" AND c.name = l."utm_campaign";
UPDATE "analytics" a SET "campaignId" = l."campaignId" FROM "links" l
WHERE a."linkId" = l.id AND l."campaignId" IS NOT NULL;
UPDATE "lead_events" e SET "campaignId" = l."campaignId" FROM "links" l
WHERE e."linkId" = l.id AND e."workspaceId" = l."workspaceId" AND l."campaignId" IS NOT NULL;
CREATE INDEX "links_campaignId_idx" ON "links"("campaignId");
ALTER TABLE "campaign_costs" ADD CONSTRAINT "campaign_costs_nonnegative_spend" CHECK (spend >= 0);
