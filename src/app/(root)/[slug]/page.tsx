import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SlugPasswordForm from "./password-form";
import NotFound from "../not-found";

// Password gates must never be indexed — the slug URL would otherwise leak
// into search results before the visitor can authenticate.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SlugPasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  if (slug === "not-found") {
    return <NotFound />;
  }

  return <SlugPasswordForm slug={slug} />;
}
