-- DropForeignKey
ALTER TABLE "links" DROP CONSTRAINT "links_customDomainId_fkey";

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_customDomainId_fkey" FOREIGN KEY ("customDomainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
