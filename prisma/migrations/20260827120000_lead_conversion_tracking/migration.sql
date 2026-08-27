-- AlterTable
ALTER TABLE "workspace_api_keys" ADD COLUMN "leadsPermission" "ResourcePermission" NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "lead_customers" (
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

    CONSTRAINT "lead_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "clickId" TEXT NOT NULL,
    "customerExternalId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_customers_workspaceId_idx" ON "lead_customers"("workspaceId");

-- CreateIndex
CREATE INDEX "lead_customers_clickId_idx" ON "lead_customers"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_customers_workspaceId_externalId_key" ON "lead_customers"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "lead_events_workspaceId_createdAt_idx" ON "lead_events"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_events_linkId_createdAt_idx" ON "lead_events"("linkId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_events_clickId_idx" ON "lead_events"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_events_workspaceId_customerExternalId_eventName_key" ON "lead_events"("workspaceId", "customerExternalId", "eventName");

-- AddForeignKey
ALTER TABLE "lead_customers" ADD CONSTRAINT "lead_customers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_customers" ADD CONSTRAINT "lead_customers_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_workspaceId_customerExternalId_fkey" FOREIGN KEY ("workspaceId", "customerExternalId") REFERENCES "lead_customers"("workspaceId", "externalId") ON DELETE RESTRICT ON UPDATE CASCADE;
