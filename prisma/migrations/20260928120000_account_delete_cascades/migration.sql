-- Account deletion: every row reachable from User must cascade or null out,
-- otherwise DELETE /api/account/:id dies with an FK 500.
-- NOTE: links_userId / members_organizationId / invitations_organizationId
-- already carry these actions in the database (schema drift) — the
-- DROP/ADD pairs below re-assert them so schema, history and DB agree.

-- WorkspaceApiKey.createdBy: RESTRICT -> CASCADE (keys die with their creator;
-- the workspace row itself cascades independently)
ALTER TABLE "workspace_api_keys" DROP CONSTRAINT "workspace_api_keys_createdBy_fkey";
ALTER TABLE "workspace_api_keys" ADD CONSTRAINT "workspace_api_keys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link.creator: (already SET NULL) keep links, null the author
ALTER TABLE "links" DROP CONSTRAINT "links_userId_fkey";
ALTER TABLE "links" ADD CONSTRAINT "links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Usage.workspace: SET NULL -> CASCADE (was orphaning usage rows on workspace
-- delete; usage dies with its workspace now)
ALTER TABLE "usages" DROP CONSTRAINT "usages_workspaceId_fkey";
ALTER TABLE "usages" ADD CONSTRAINT "usages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LeadEvent.customer: RESTRICT -> CASCADE
ALTER TABLE "lead_events" DROP CONSTRAINT "lead_events_workspaceId_customerExternalId_fkey";
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_workspaceId_customerExternalId_fkey" FOREIGN KEY ("workspaceId", "customerExternalId") REFERENCES "lead_customers"("workspaceId", "externalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Member.organization / Invitation.organization: (already SET NULL) keep rows, unlink org
ALTER TABLE "members" DROP CONSTRAINT "members_organizationId_fkey";
ALTER TABLE "members" ADD CONSTRAINT "members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invitations" DROP CONSTRAINT "invitations_organizationId_fkey";
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
