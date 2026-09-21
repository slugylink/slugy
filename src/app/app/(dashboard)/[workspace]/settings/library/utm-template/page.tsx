import UtmTemplatesClient from "./page-client";

export default async function UtmTemplates({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const context = await params;
  return <UtmTemplatesClient workspaceslug={context.workspace} />;
}
