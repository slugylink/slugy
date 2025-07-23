import { cn } from "@/lib/utils";
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

// Type for social media platform mapping
type SocialIcon = Record<string, ReactElement>;

// Improved database query function with proper typing
async function getGallery(
  username: string,
  options?: { select?: object; include?: object },
): Promise<
  | (Partial<Bio> & { links?: BioLinks[]; socials?: BioSocials[] })
  | null
> {
  try {
    const gallery = await db.bio.findUnique({
      where: { username },
      ...(options?.select ? { select: options.select } : {}),
      ...(options?.include ? { include: options.include } : {}),
    });
    return gallery ?? null;
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return null;
  }
}

// Social media icons mapping
const socialIcons: SocialIcon = {
  facebook: <RiFacebookFill size={20} />,
  instagram: <RiInstagramLine size={20} />,
  twitter: <RiTwitterXFill size={20} />,
  linkedin: <RiLinkedinFill size={20} />,
  youtube: <RiYoutubeFill size={20} />,
  mail: <LuMail size={20} />,
  snapchat: <RiSnapchatFill size={20} />,
};

export default async function GalleryLinksProfile(context: { params: Promise<{ username: string }> }) {
  const params = await context.params;
  const gallery = await getGallery(params.username, {
    include: {
      links: {
        where: { isPublic: true },
        orderBy: { position: "asc" },
      },
      socials: {
        where: { isPublic: true },
        orderBy: { platform: "asc" },
      },
    },
  });

  if (!gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Bio gallery not found.</p>
      </div>
    );
  }

  // Find theme or use default
  const theme =
    themes.find((t) => t.id === gallery.theme) ??
    themes.find((t) => t.id === "default")!;

  const links = gallery.links ?? [];
  const socials = (gallery.socials ?? [])
    .filter((s) => s.platform)
    .map((s) => ({
      platform: s.platform ?? "",
      url: s.url ?? "",
    }));

  return (
    <div className="h-full min-h-screen w-full bg-transparent">
      <div
        className={`fixed left-0 top-0 h-screen w-full ${theme.background} z-0`}
      />
      <div className="container relative z-10 mx-auto h-full min-h-[90vh] px-4 py-8">
        {/* Share Actions */}
        <div className="mx-auto flex max-w-md justify-end px-0">
          <ShareActions color={theme.textColor} />
        </div>

        <div className="flex flex-col items-center space-y-4">
          {/* Profile Image */}
          <div className="relative mt-4">
            <Image
              src={
                gallery.logo
                  ? gallery.logo
                  : `https://avatar.vercel.sh/${gallery.username}`
              }
              alt={gallery.username ? gallery.username : "Profile"}
              width={96}
              height={96}
              className="h-24 w-24 rounded-full border-2 border-zinc-200 bg-white object-cover"
            />
          </div>

          {/* Profile Info */}
          <div className={`text-center ${theme.textColor}`}>
            <h2 className="text-xl font-semibold">
              {gallery.name ? gallery.name : `@${gallery.username}`}
            </h2>
            {gallery.bio && (
              <p className={cn(theme.accentColor, "text-sm")}>{gallery.bio}</p>
            )}
          </div>

          {/* Social Media Icons */}
          {socials.length > 0 && (
            <div className={`flex space-x-4 ${theme.textColor}`}>
              {socials.map((social) => {
                if (!social.url || !social.platform) return null;

                const icon = socialIcons[social.platform];
                if (!icon) return null;

                // Format href for mail links
                const href =
                  social.platform === "mail" &&
                  !social.url.startsWith("mailto:")
                    ? `mailto:${social.url}`
                    : social.url;

                const isMailLink = social.platform === "mail";

                return (
                  <a
                    key={social.platform}
                    href={href}
                    target={isMailLink ? "_self" : "_blank"}
                    rel={isMailLink ? "" : "noopener noreferrer"}
                    className="transition hover:opacity-80"
                    aria-label={`${social.platform} profile`}
                  >
                    {icon}
                  </a>
                );
              })}
            </div>
          )}

          {/* Navigation Link Buttons */}
          <div className="w-full max-w-md space-y-3 pt-4 text-sm">
            {links.length > 0 ? (
              links.map((link) => (
                <a
                  key={link.id}
                  href={`${link.url}/?ref=slugy.co`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full rounded-full px-4 py-[10px] text-center transition ${theme.buttonStyle}`}
                >
                  {link.title ? link.title : link.url}
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

      {/* Footer Logo */}
      <div
        className={`relative bottom-0 z-10 flex items-center justify-center gap-1 py-6 pt-10 ${theme.textColor}`}
      >
        <CornerDownRight size={14} />
        <Link href="https://slugy.co">slugy</Link>
      </div>
    </div>
  );
}

export async function generateMetadata(context: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const params = await context.params;
  const username = params.username;
  const gallery = await getGallery(username, { select: { name: true } });
  const displayName = gallery?.name ? gallery.name : username;

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
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
