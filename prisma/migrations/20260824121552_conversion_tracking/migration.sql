-- CreateEnum
CREATE TYPE "ConversionEventType" AS ENUM ('lead', 'sale', 'custom');

-- AlterTable
ALTER TABLE "workspace_api_keys" ADD COLUMN     "conversionsPermission" "ResourcePermission" NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "tracked_clicks" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "clickId" TEXT,
    "linkId" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "clickId" TEXT,
    "customerId" TEXT,
    "customerExternalId" TEXT,
    "type" "ConversionEventType" NOT NULL,
    "eventName" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT,
    "invoiceId" TEXT,
    "paymentProcessor" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_clicks_workspaceId_createdAt_idx" ON "tracked_clicks"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "tracked_clicks_linkId_idx" ON "tracked_clicks"("linkId");

-- CreateIndex
CREATE INDEX "customers_workspaceId_idx" ON "customers"("workspaceId");

-- CreateIndex
CREATE INDEX "customers_clickId_idx" ON "customers"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_workspaceId_externalId_key" ON "customers"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "conversion_events_workspaceId_customerExternalId_eventName__idx" ON "conversion_events"("workspaceId", "customerExternalId", "eventName", "type");

-- CreateIndex
CREATE INDEX "conversion_events_workspaceId_createdAt_idx" ON "conversion_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "conversion_events_linkId_createdAt_idx" ON "conversion_events"("linkId", "createdAt");

-- CreateIndex
CREATE INDEX "conversion_events_clickId_idx" ON "conversion_events"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_events_workspaceId_invoiceId_key" ON "conversion_events"("workspaceId", "invoiceId");

-- AddForeignKey
ALTER TABLE "tracked_clicks" ADD CONSTRAINT "tracked_clicks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_clicks" ADD CONSTRAINT "tracked_clicks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
