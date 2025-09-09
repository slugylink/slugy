import { SharedLayout } from "@/components/web/shared-layout";
import { getLayoutData } from "@/lib/layout-utils";
import { filterValidWorkspaces } from "@/lib/workspace-utils";

export default async function OthersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutData = await getLayoutData();

  return (
    <SharedLayout
      workspaceslug={layoutData.workspaceslug}
      workspaces={filterValidWorkspaces(layoutData.workspaces) as {
        id: string;
        name: string;
        slug: string;
        userRole: "owner" | "admin" | "member" | null;
      }[]}
    >
      {children}
    </SharedLayout>
  );
}
