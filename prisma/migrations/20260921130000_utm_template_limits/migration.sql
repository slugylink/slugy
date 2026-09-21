-- UTM template limits per subscription plan / workspace.
ALTER TABLE "plans" ADD COLUMN "maxUtmTemplates" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "workspaces" ADD COLUMN "maxUtmTemplates" INTEGER NOT NULL DEFAULT 5;
