import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  description: "Slugy blog — articles and product updates coming soon.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/blogs" },
};

export default function BlogsPage() {
  return (
    <main className="mx-auto mt-[120px] flex min-h-[50vh] max-w-2xl flex-col items-center px-4 py-16 text-center">
      <h1 className="text-2xl font-medium text-balance sm:text-4xl">
        Blog coming soon
      </h1>
      <p className="text-muted-foreground mt-4 text-sm sm:text-base">
        We&apos;re working on guides and updates about link management,
        analytics, and building with Slugy. Check back soon.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
