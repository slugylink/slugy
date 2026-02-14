-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "maxLinksPerWorkspace" SET DEFAULT 20,
ALTER COLUMN "maxClicksPerWorkspace" SET DEFAULT 500;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "maxLinksLimit" SET DEFAULT 20,
ALTER COLUMN "maxClicksLimit" SET DEFAULT 500;
