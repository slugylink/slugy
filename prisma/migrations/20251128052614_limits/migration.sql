-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "maxTagsPerWorkspace" INTEGER NOT NULL DEFAULT 5,
ALTER COLUMN "maxLinksPerWorkspace" SET DEFAULT 25,
ALTER COLUMN "maxCustomDomains" SET DEFAULT 2;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "maxLinkTags" INTEGER NOT NULL DEFAULT 5,
ALTER COLUMN "maxLinksLimit" SET DEFAULT 25;
