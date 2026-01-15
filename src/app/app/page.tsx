import { getAuthSession } from "@/lib/auth";
import { getActiveSubscription } from "@/server/actions/subscription";
import { getDefaultWorkspace } from "@/server/actions/workspace/workspace";
import { redirect } from "next/navigation";

export default async function App() {
  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }

  const { session } = authResult;

  const [subscriptionStatus, defaultWorkspace] = await Promise.all([
    getActiveSubscription(session.user.id),
    getDefaultWorkspace(session.user.id),
  ]);

  if (!subscriptionStatus.status && !subscriptionStatus.subscription) {
    redirect("/onboarding/welcome");
  }

  if (!defaultWorkspace.success || !defaultWorkspace.workspace) {
    redirect("/onboarding/create-workspace");
  }

  redirect(`/${defaultWorkspace.workspace.slug}`);
}
