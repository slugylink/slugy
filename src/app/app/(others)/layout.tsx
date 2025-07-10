import { SharedLayout } from "@/components/web/shared-layout";
import { auth } from "@/lib/auth";
import { fetchAllWorkspaces } from "@/server/actions/workspace/workspace";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OthersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return redirect("/login");
  }

  const allWorkspaces = await fetchAllWorkspaces(session.user.id);
  const workspaces = allWorkspaces.success ? allWorkspaces.workspaces : [];
  const workspaceslug = workspaces.length > 0 ? workspaces[0].slug : "";

  return (
    <SharedLayout workspaceslug={workspaceslug} workspaces={workspaces}>
      {children}
    </SharedLayout>
  );
}
