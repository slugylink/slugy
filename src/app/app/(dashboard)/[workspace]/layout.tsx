import { cookies } from "next/headers";
import WorkspaceNotFound from "@/components/web/_workspace/not-found";
import { SharedLayout } from "@/components/web/shared-layout";
import { getLayoutData } from "@/lib/layout-utils";
import { filterValidWorkspaces } from "@/lib/workspace-utils";

// Matches SIDEBAR_COOKIE_NAME in components/ui/sidebar.tsx.
const SIDEBAR_COOKIE_NAME = "sidebar_state";

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
  const [layoutData, cookieStore] = await Promise.all([
    getLayoutData(workspace),
    cookies(),
  ]);

  if (layoutData.workspaceNotFound) {
    return <WorkspaceNotFound />;
  }

  const validWorkspaces = filterValidWorkspaces(
    layoutData.workspaces,
  ) as WorkspaceData[];

  // Read the persisted collapse state on the server so the first paint already
  // matches it — avoids the expand-then-snap-shut flash a client-only effect had.
  const defaultSidebarOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <SharedLayout
      workspaceslug={layoutData.workspaceslug}
      workspaces={validWorkspaces}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </SharedLayout>
  );
}
