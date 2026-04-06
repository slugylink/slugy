import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import ApiKeysClient from "./page-client";

export default async function ApiKeysPage({
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

  const workspace = await db.workspace.findFirst({
    where: {
      userId: session.user.id,
      slug: context.workspace,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!workspace) {
    return redirect("/login");
  }

  const apiKeys = await db.workspaceApiKey.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsed: true,
      expiresAt: true,
      permissionLevel: true,
      linksPermission: true,
      key: true,
    },
  });

  return (
    <ApiKeysClient
      workspaceslug={context.workspace}
      initialApiKeys={apiKeys.map((apiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        keyPreview: `${apiKey.key.slice(0, 10)}...${apiKey.key.slice(-4)}`,
        createdAt: apiKey.createdAt.toISOString(),
        lastUsed: apiKey.lastUsed?.toISOString() ?? null,
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        permissionLevel: apiKey.permissionLevel,
        linksPermission: apiKey.linksPermission,
      }))}
    />
  );
}
