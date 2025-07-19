import GalleryClient from "./bioClient";

export default async function BioLinksPage(context: {
  params: Promise<{ username: string; workspaceslug: string }>;
}) {
  const params = await context.params;
  return (
    <GalleryClient
      username={params.username}
    />
  );
}
