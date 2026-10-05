-- Optional owner-only gate for integrations management.
-- Default false preserves current behavior (any member may manage).
-- Purely additive: existing rows read as unrestricted.
ALTER TABLE "workspaces" ADD COLUMN "integrationsManagerOnly" BOOLEAN NOT NULL DEFAULT false;
