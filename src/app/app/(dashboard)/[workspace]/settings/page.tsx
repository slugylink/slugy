import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import WorkspaceNameForm from "@/components/web/_settings/workspace-name-form";
import WorkspaceSlugForm from "@/components/web/_settings/workspace-slug-form";
import WorkspaceLogoForm from "@/components/web/_settings/workspace-logo";
import { AlertDialogBox } from "@/components/web/_settings/alert-box";

export default async function Settings({
  params,
}: {
  params: Promise<{
    workspace: string;
  }>;
}) {
  const context = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return redirect("/login");
  }

  const workspaces = await db.workspace.findFirst({
    where: {
      userId: session.user.id,
      slug: context.workspace,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
    },
  });

  if (!workspaces) {
    return redirect("/login");
  }

  const workspaceData = {
    ...workspaces,
    logo: workspaces.logo ?? undefined,
  };

  return (
    <div className="space-y-6 py-3">
      <WorkspaceLogoForm
        workspaceslug={context.workspace}
        initialData={workspaceData}
        userId={session.user.id}
      />
      <WorkspaceNameForm
        workspaceslug={context.workspace}
        initialData={workspaceData}
        userId={session.user.id}
      />

      <WorkspaceSlugForm
        userId={session.user.id}
        workspaceslug={context.workspace}
        initialData={workspaces}
      />

      <Card className="border-destructive border shadow-none">
        <CardHeader className="">
          <CardTitle className="text-destructive">Delete Workspace</CardTitle>
          <CardDescription>
            Permanently delete your workspace, custom domain, and all associated
            links + their stats. This action cannot be undone - please proceed
            with caution.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialogBox workspaceslug={context.workspace} />
        </CardFooter>
      </Card>
    </div>
  );
}
