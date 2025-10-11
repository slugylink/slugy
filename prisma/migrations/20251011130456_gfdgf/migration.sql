-- AlterTable
ALTER TABLE "custom_domains" ADD COLUMN     "cloudflareCnameTarget" TEXT,
ADD COLUMN     "cloudflareCustomHostnameId" TEXT,
ADD COLUMN     "cloudflareSslStatus" TEXT,
ADD COLUMN     "cloudflareStatus" TEXT;
