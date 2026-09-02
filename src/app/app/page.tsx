import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { getDefaultWorkspace } from "@/server/actions/workspace/workspace";
import { warmDefaultWorkspaceRedirectCache } from "@/lib/middleware/get-default-workspace-redirect";
import {
  parseWorkspaceSlug,
  WORKSPACE_COOKIE_NAME,
} from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";

export default async function App() {
  const cookieSlug = parseWorkspaceSlug(
    (await cookies()).get(WORKSPACE_COOKIE_NAME)?.value,
  );
  if (cookieSlug) {
    redirect(`/${cookieSlug}`);
  }

  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }

  const { session } = authResult;

  const defaultWorkspace = await getDefaultWorkspace(session.user.id);

  if (!defaultWorkspace.success || !defaultWorkspace.workspace) {
    await warmDefaultWorkspaceRedirectCache(session.user.id, null);
    redirect("/onboarding/welcome");
  }

  await warmDefaultWorkspaceRedirectCache(
    session.user.id,
    defaultWorkspace.workspace.slug,
  );

  redirect(`/${defaultWorkspace.workspace.slug}`);
}
