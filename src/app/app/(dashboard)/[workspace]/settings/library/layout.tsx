import Navitems from "@/components/web/_library/navitems";

export default async function LibraryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const context = await params;
  return (
    <div>
      <Navitems workspaceslug={context.workspace} />
      {children}
    </div>
  );
}
