export default function MaxWidthContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto w-full max-w-7xl px-3 md:px-6">{children}</div>;
}
