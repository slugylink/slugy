import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test",
  description: "Internal test page.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
