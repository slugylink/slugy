import { SharedLayout } from "@/components/web/shared-layout";
import { getLayoutData } from "@/lib/layout-utils";
import { filterValidWorkspaces } from "@/lib/workspace-utils";

type WorkspaceData = {
  id: string;
  name: string;
  slug: string;
  userRole: "owner" | "admin" | "member" | null;
};

interface OthersLayoutProps {
  children: React.ReactNode;
}

export default async function OthersLayout({
  children,
}: OthersLayoutProps) {
  const layoutData = await getLayoutData();

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
