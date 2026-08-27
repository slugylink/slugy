import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ApiKeysClient from "./page-client";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const ws = await db.workspace.findFirst({
    where: {
      slug: workspace,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true },
  });

  if (!ws) redirect("/login");

  return <ApiKeysClient workspaceslug={workspace} />;
}
