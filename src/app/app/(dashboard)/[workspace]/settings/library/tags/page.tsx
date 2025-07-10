import TagsClient from "./page-client";

export default async function Tags({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const context = await params;
  return <TagsClient workspaceslug={context.workspace} />;
}
