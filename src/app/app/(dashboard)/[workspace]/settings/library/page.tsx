import { redirect } from "next/navigation";

export default async function Library({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const context = await params;
  return redirect(`/${context.workspace}/settings/library/tags`);
}
