import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Domain - Powered by Slugy",
  description: "Custom domain landing page",
};

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

