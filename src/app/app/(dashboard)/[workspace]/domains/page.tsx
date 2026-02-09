import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import DomainsClient from "./page-client";
import useSWR from "swr";

export default async function DomainsSettings({
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

  // Get workspace with subscription data
  const workspace = await db.workspace.findFirst({
    where: {
      slug: context.workspace,
      OR: [
        { userId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      userId: true,
      customDomains: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!workspace) {
    return redirect("/login");
  }

  // Get user's subscription to check domain limit
  const subscription = await db.subscription.findUnique({
    where: { referenceId: session.user.id },
    include: { plan: true },
  });

  const maxDomains = subscription?.plan?.maxCustomDomains ?? 0;
  const isOwnerOrAdmin = workspace.userId === session.user.id;

  return (
    <div className="space-y-6 py-3">
      <DomainsClient
        workspaceslug={context.workspace}
        initialDomains={workspace.customDomains}
        maxDomains={maxDomains}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />
    </div>
  );
}
