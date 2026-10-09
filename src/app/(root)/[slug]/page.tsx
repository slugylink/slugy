import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SlugPasswordForm from "./password-form";
import { getLink } from "@/lib/middleware/get-link";

// Password gates stay noindex so slug URLs never leak into search results.
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

  // Misses 404 here (middleware redirects hits, so only gates land here).
  const link = await getLink(slug).catch(() => null);

  if (link?.requiresPassword) {
    return <SlugPasswordForm slug={slug} />;
  }

  if (link?.success && link.url) {
    redirect(link.url);
  }

  notFound();
}
