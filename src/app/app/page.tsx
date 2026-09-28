import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import {
  getRedirectWorkspace,
  validateWorkspaceSlug,
} from "@/server/actions/workspace/workspace";
import { warmDefaultWorkspaceRedirectCache } from "@/lib/middleware/get-default-workspace-redirect";
import {
  parseWorkspaceSlug,
  WORKSPACE_COOKIE_NAME,
} from "@/lib/workspace-cookie";
import { redirect } from "next/navigation";

export default async function App() {
  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }

  const { session } = authResult;

  // The cookie can hold the PREVIOUS account's slug after logout/login —
  // only honor it when the current user can access it.
  const cookieSlug = parseWorkspaceSlug(
    (await cookies()).get(WORKSPACE_COOKIE_NAME)?.value,
  );
  if (cookieSlug) {
    const validation = await validateWorkspaceSlug(session.user.id, cookieSlug);
    if (validation.success && validation.workspace) {
      redirect(`/${cookieSlug}`);
    }
    // Stale/foreign slug: fall through to this user's workspace below.
  }

  // Owned default → oldest owned → oldest member workspace. Invited-only
  // users land in their shared workspace instead of onboarding.
  const defaultWorkspace = await getRedirectWorkspace(session.user.id);

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
