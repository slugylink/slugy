import WorkspaceNotFound from "@/components/web/_workspace/not-found";
import { SharedLayout } from "@/components/web/shared-layout";
import { getLayoutData } from "@/lib/layout-utils";
import { filterValidWorkspaces } from "@/lib/workspace-utils";

// Shared type for workspace data - ensures consistency across layouts
type WorkspaceData = {
  id: string;
  name: string;
  slug: string;
  userRole: "owner" | "admin" | "member" | null;
};

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
  const { workspace } = await params;
  const layoutData = await getLayoutData(workspace);

  if (layoutData.workspaceNotFound) {
    return <WorkspaceNotFound />;
  }

  const validWorkspaces = filterValidWorkspaces(
    layoutData.workspaces
  ) as WorkspaceData[];

  return (
    <SharedLayout
      workspaceslug={layoutData.workspaceslug}
      workspaces={validWorkspaces}
    >
      {children}
    </SharedLayout>
  );
}
