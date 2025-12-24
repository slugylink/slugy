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

export default async function OthersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutData = await getLayoutData();

  return (
    <SharedLayout
      workspaceslug={layoutData.workspaceslug}
      workspaces={filterValidWorkspaces(layoutData.workspaces) as WorkspaceData[]}
    >
      {children}
    </SharedLayout>
  );
}
