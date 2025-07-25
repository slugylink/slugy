import { db } from "@/server/db";
import { themes } from "@/constants/theme";
import type { Bio, BioLinks, BioSocials } from "@prisma/client";
import Image from "next/image";
import {
  RiFacebookFill,
  RiInstagramLine,
  RiLinkedinFill,
  RiTwitterXFill,
  RiYoutubeFill,
  RiSnapchatFill,
} from "react-icons/ri";
import { LuMail } from "react-icons/lu";
import { CornerDownRight } from "lucide-react";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";

//--- Social Icons ---
const SOCIAL_ICONS: Record<string, ReactElement> = {
  facebook: <RiFacebookFill size={20} />,
  instagram: <RiInstagramLine size={20} />,
  twitter: <RiTwitterXFill size={20} />,
  linkedin: <RiLinkedinFill size={20} />,
  youtube: <RiYoutubeFill size={20} />,
  mail: <LuMail size={20} />,
  snapchat: <RiSnapchatFill size={20} />,
};

//--- Data fetching helper ---
async function getGallery(username: string) {
  try {
    return (await db.bio.findUnique({
      where: { username },
      include: {
        links: { where: { isPublic: true }, orderBy: { position: "asc" } },
        socials: { where: { isPublic: true }, orderBy: { platform: "asc" } },
      },
    })) as (Bio & { links: BioLinks[]; socials: BioSocials[] }) | null;
  } catch (e) {
    console.error("Gallery fetch error:", e);
    return null;
  }
}

//--- Main Server Component ---
export default async function GalleryLinksProfile({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const gallery = await getGallery(username);

  if (!gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Bio gallery not found.</p>
      </div>
    );
  }

  const theme =
    themes.find((t) => t.id === gallery.theme) ||
    themes.find((t) => t.id === "default")!;
  const socials = (gallery.socials ?? []).filter((s) => s.platform && s.url);
  const links = gallery.links ?? [];

  return (
    <div className="h-full min-h-screen w-full bg-transparent">
      <div
        className={`fixed top-0 left-0 h-screen w-full ${theme.background} z-0`}
      />
      <div className="relative z-10 container mx-auto h-full min-h-[90vh] px-4 py-8">
        <div className="mx-auto flex max-w-md justify-end px-0">
          <ShareActions color={theme.textColor} />
        </div>
        <div className="flex flex-col items-center space-y-4">
          {/* Profile Image */}
          <div className="relative mt-4">
            <Image
              src={
                gallery.logo || `https://avatar.vercel.sh/${gallery.username}`
              }
              alt={gallery.username || "Profile"}
              width={96}
              height={96}
              className="h-24 w-24 rounded-full border-2 border-zinc-200 bg-white object-cover"
            />
          </div>
          {/* Info */}
          <div className={`text-center ${theme.textColor}`}>
            <h2 className="text-xl font-semibold">
              {gallery.name || `@${gallery.username}`}
            </h2>
            {gallery.bio && (
              <p className={`${theme.accentColor} text-sm`}>{gallery.bio}</p>
            )}
          </div>
          {/* Socials */}
          {!!socials.length && (
            <div className={`flex space-x-4 ${theme.textColor}`}>
              {socials.map(({ platform, url }) => {
                if (!platform || !url) return null;
                const Icon = SOCIAL_ICONS[platform];
                if (!Icon) return null;
                const href =
                  platform === "mail" && !url.startsWith("mailto:")
                    ? `mailto:${url}`
                    : url;
                const isMail = platform === "mail";
                return (
                  <a
                    key={platform}
                    href={href}
                    target={isMail ? "_self" : "_blank"}
                    rel={isMail ? undefined : "noopener noreferrer"}
                    className="transition hover:opacity-80"
                    aria-label={`${platform} profile`}
                  >
                    {Icon}
                  </a>
                );
              })}
            </div>
          )}
          {/* Links */}
          <div className="w-full max-w-md space-y-3 pt-4 text-sm">
            {links.length ? (
              links.map((link) => (
                <a
                  key={link.id}
                  href={`${link.url}/?ref=slugy.co`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full rounded-full px-4 py-[10px] text-center transition ${theme.buttonStyle}`}
                >
                  {link.title || link.url}
                </a>
              ))
            ) : (
              <p className={`text-center ${theme.textColor}`}>
                No links available.
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div
        className={`relative bottom-0 z-10 flex items-center justify-center gap-1 py-6 pt-10 ${theme.textColor}`}
      >
        <CornerDownRight size={14} />
        <Link href="https://slugy.co">slugy</Link>
      </div>
    </div>
  );
}

//--- Metadata (SEO/Open Graph) ---
export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const { username } = params;
  const gallery = await db.bio.findUnique({
    where: { username },
    select: { name: true },
  });
  const displayName = gallery?.name || username;
  const title = `${displayName} - Links Gallery | Slugy`;
  const description =
    "Discover and share curated links in this gallery. Powered by Slugy.";
  const imageUrl =
    "https://opengraph.b-cdn.net/production/images/1160136e-9ad9-49c3-832c-80392cf860d7.png?token=Tk-p0tmXKfat-A7zU1aov_tcgG82lYmfeLr-zxR1LpI&height=630&width=1200&expires=33289246448";
  const canonicalUrl = `https://bio.slugy.co/${username}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Slugy",
      url: canonicalUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Links Gallery Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, alt: "Links Gallery Preview" }],
    },
    alternates: { canonical: canonicalUrl },
  };
}
