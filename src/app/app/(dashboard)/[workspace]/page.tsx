import dynamic from "next/dynamic";

const LinksTable = dynamic(
  () => import("@/components/web/_links/links-table"),
  {
    ssr: true,
  },
);

export default async function Workspace({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <div className="mt-8">
      <LinksTable workspaceslug={workspace} />
    </div>
  );
}
