/*
  Warnings:

  - A unique constraint covering the columns `[slug,domain]` on the table `links` will be added. If there are existing duplicate values, this will fail.
  - Made the column `domain` on table `links` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "links_slug_key";

-- AlterTable
ALTER TABLE "links" ALTER COLUMN "domain" SET NOT NULL,
ALTER COLUMN "domain" SET DEFAULT 'slugy.co';

-- CreateIndex
CREATE UNIQUE INDEX "links_slug_domain_key" ON "links"("slug", "domain");
