export default function MaxWidthContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto w-full max-w-6xl px-3">{children}</div>;
}
