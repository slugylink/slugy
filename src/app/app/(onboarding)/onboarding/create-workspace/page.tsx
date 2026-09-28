import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import CreateWorkspaceForm from "./create-workspace-form";

// Step 2 guard: welcome (intendedUse) must be completed first. Direct
// deep-links to this step bounce back to step 1.
export default async function CreateWorkspacePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { intendedUse: true },
  });
  if (!user?.intendedUse) {
    redirect("/onboarding/welcome");
  }

  return <CreateWorkspaceForm />;
}
