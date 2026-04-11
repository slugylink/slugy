/*
  Warnings:

  - The values [premium] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('basic', 'pro');
ALTER TABLE "plans" ALTER COLUMN "planType" DROP DEFAULT;
ALTER TABLE "plans" ALTER COLUMN "planType" TYPE "PlanType_new" USING ("planType"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "PlanType_old";
ALTER TABLE "plans" ALTER COLUMN "planType" SET DEFAULT 'basic';
COMMIT;

-- AlterTable
ALTER TABLE "bios" ALTER COLUMN "maxClicksLimit" SET DEFAULT 1000;

-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "maxClicksPerWorkspace" SET DEFAULT 1000;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "maxClicksLimit" SET DEFAULT 1000;
