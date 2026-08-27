import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostSlugs } from "@/content/blogs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/blogs/${post.slug}` },
    openGraph: {
      title: `${post.title} | Slugy`,
      description: post.description,
      url: `/blogs/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author.name],
      tags: post.tags,
    },
    twitter: {
      title: `${post.title} | Slugy`,
      description: post.description,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { Content } = post;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
  const baseUrl = `https://${rootDomain}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "Slugy",
      url: baseUrl,
    },
    mainEntityOfPage: `${baseUrl}/blogs/${post.slug}`,
  };

  return (
    <main className="mx-auto mt-[120px] min-h-[50vh] w-full max-w-3xl px-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-muted-foreground mb-8 text-sm">
        <Link href="/blogs" className="hover:text-foreground transition-colors">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground line-clamp-1">{post.title}</span>
      </nav>

      <header className="mb-10 border-b pb-8">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          <span aria-hidden>·</span>
          <span>{post.author.name}</span>
        </div>
        <h1 className="text-foreground mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {post.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-base leading-7 sm:text-lg">
          {post.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <Content />
    </main>
  );
}
