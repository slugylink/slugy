import { getAuthSession } from "@/lib/auth";
import { getDefaultWorkspace } from "@/server/actions/workspace/workspace";
import { redirect } from "next/navigation";

export default async function App() {
  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }

  const { session } = authResult;

  const defaultWorkspace = await getDefaultWorkspace(session.user.id);

  if (!defaultWorkspace.success || !defaultWorkspace.workspace) {
    redirect("/onboarding/create-workspace");
  }

  redirect(`/${defaultWorkspace.workspace.slug}`);
}
