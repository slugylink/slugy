import WorkspaceNotFound from "@/components/web/_workspace/not-found";
import { SharedLayout } from "@/components/web/shared-layout";
import { auth } from "@/lib/auth";
import {
  fetchAllWorkspaces,
  validateworkspaceslug,
} from "@/server/actions/workspace/workspace";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    workspace: string;
  }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) return redirect("/login");

  const awaitedParams = await params;
  const validSlug = await validateworkspaceslug(
    session.user.id,
    awaitedParams.workspace,
  );

  if (!validSlug.success) return <WorkspaceNotFound />;

  const allWorkspaces = await fetchAllWorkspaces(session.user.id);
  return (
    <SharedLayout
      workspaceslug={awaitedParams.workspace}
      workspaces={
        allWorkspaces.success && allWorkspaces.workspaces
          ? allWorkspaces.workspaces.filter((workspace): workspace is NonNullable<typeof workspace> => workspace !== null)
          : []
      }
    >
      {children}
    </SharedLayout>
  );
}
