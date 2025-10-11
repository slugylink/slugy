/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `custom_domains` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "custom_domains_workspaceId_idx";

-- AlterTable
ALTER TABLE "custom_domains" DROP COLUMN "deletedAt",
ADD COLUMN     "dnsConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastChecked" TIMESTAMP(3),
ADD COLUMN     "redirectToWww" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sslEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sslExpiresAt" TIMESTAMP(3),
ADD COLUMN     "sslIssuer" TEXT,
ADD COLUMN     "verificationToken" TEXT;

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "customDomainId" TEXT;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_customDomainId_fkey" FOREIGN KEY ("customDomainId") REFERENCES "custom_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
