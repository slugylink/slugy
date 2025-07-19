import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import TeamClient from "./teamClient";

export default async function Team({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const context = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <div>Unauthorized</div>;
  }

  return (
    <TeamClient 
      workspaceslug={context.workspace} 
      currentUserId={session.user.id} 
    />
  );
}
