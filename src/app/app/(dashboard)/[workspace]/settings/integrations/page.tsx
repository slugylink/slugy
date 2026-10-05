import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import IntegrationsClient from "./page-client";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/login");

  const ws = await db.workspace.findFirst({
    where: {
      slug: workspace,
      deletedAt: null,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    select: { slug: true },
  });
  if (!ws) return redirect("/login");

  return <IntegrationsClient workspaceslug={ws.slug} />;
}
