import { getAuthSession } from "@/lib/auth";
import { getActiveSubscription } from "@/server/actions/subscription";
import { getDefaultWorkspace } from "@/server/actions/workspace/workspace";
import { redirect } from "next/navigation";

export default async function App() {
  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }
  const session = authResult.session;

  const [subscriptionStatus, defaultWorkspace] = await Promise.all([
    getActiveSubscription(session?.user?.id),
    getDefaultWorkspace(session?.user?.id),
  ]);

  if (!subscriptionStatus.status && !subscriptionStatus.subscription) {
    return redirect("/onboarding/welcome");
  }

  if (defaultWorkspace.success === false && !defaultWorkspace.workspace) {
    return redirect("/onboarding/create-workspace");
  }

  return redirect(`/${defaultWorkspace.workspace?.slug}`);
}
