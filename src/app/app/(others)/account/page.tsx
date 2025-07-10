import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import UserAccountForms from "@/components/web/_account/account-forms";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return redirect("/login");
  }

  const account = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      ownedWorkspaces: {
        select: {
          id: true,
          slug: true,
          name: true,
          isDefault: true,
        },
      },
    },
  });

  if (!account) {
    return null;
  }

  return (
    <main className="mx-auto w-full">
      <UserAccountForms account={account} />
    </main>
  );
}
