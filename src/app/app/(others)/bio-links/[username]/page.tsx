import GalleryClient from "./bioClient";

export default async function BioLinksPage(context: {
  params: Promise<{ username: string; workspaceSlug: string }>;
}) {
  const params = await context.params;
  return (
    <GalleryClient
      username={params.username}
      workspaceSlug={params.workspaceSlug}
    />
  );
}
