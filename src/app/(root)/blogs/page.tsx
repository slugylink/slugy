import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/content/blogs";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and product updates from Slugy — link analytics, lead conversion tracking, and building with short links.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: "Blog | Slugy",
    description:
      "Guides and product updates from Slugy — analytics, lead conversion, and short links.",
    url: "/blogs",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy blog — guides on link analytics and conversion tracking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Slugy",
    description:
      "Guides and product updates from Slugy — analytics, lead conversion, and short links.",
    images: [
      "https://files.slugy.co/Slugy%20-%20Short%20links%20with%20powerful%20analytics.webp",
    ],
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogsPage() {
  const posts = getAllPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Slugy Blog",
    description:
      "Guides and product updates from Slugy — link analytics, lead conversion tracking, and building with short links.",
    url: "/blogs",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: `/blogs/${post.slug}`,
      datePublished: post.publishedAt,
    })),
  };

  return (
    <main className="mx-auto mt-[120px] min-h-[50vh] w-full max-w-3xl px-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mb-12">
        <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Blog
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm sm:text-base">
          Guides on link analytics, lead conversion, and building with Slugy.
        </p>
      </header>

      <ul className="divide-border divide-y border-t">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blogs/${post.slug}`}
              className="group hover:bg-muted/30 -mx-2 flex flex-col gap-2 rounded-md px-2 py-6 transition-colors"
            >
              <time
                dateTime={post.publishedAt}
                className="text-muted-foreground text-xs"
              >
                {formatDate(post.publishedAt)}
              </time>
              <h2 className="text-foreground text-lg font-medium tracking-tight group-hover:underline group-hover:underline-offset-4 sm:text-xl">
                {post.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-6 sm:text-[15px]">
                {post.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
