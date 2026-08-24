import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import ApiKeysClient from "./page-client";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const access = await getWorkspaceAccess(session.user.id, workspace);
  if (!access.success || !access.workspace) {
    redirect(`/${workspace}`);
  }

  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${workspace}/settings`);
  }

  return <ApiKeysClient workspaceslug={workspace} />;
}
