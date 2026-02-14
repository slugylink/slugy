import type { BioSocials } from "@prisma/client";
import type { SocialLinksProps, SocialPlatform } from "@/types/bio-links";
import { SOCIAL_PLATFORMS } from "@/constants/bio-links";
import { getSocialIcon } from "./social-icons";
import { formatEmailUrl } from "@/utils/bio-links";
import Link from "next/link";

const SOCIAL_ICON_COLORS: Record<SocialPlatform, string> = {
  facebook: "text-[#1877F2]",
  instagram: "text-[#E4405F]",
  twitter: "text-black",
  linkedin: "text-[#0A66C2]",
  youtube: "text-[#FF0000]",
  mail: "text-[#2563EB]",
  snapchat: "text-[#FFFC00]",
};

export default function SocialLinks({ socials, theme }: SocialLinksProps) {
  const validSocials = socials.filter(
    (s): s is BioSocials & { platform: SocialPlatform } =>
      Boolean(s.platform && s.url && s.platform in SOCIAL_PLATFORMS),
  );

  if (!validSocials.length) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-1.5 ${theme.textColor}`}
    >
      {validSocials.map(({ platform, url }) => {
        const platformConfig = SOCIAL_PLATFORMS[platform];

        if (!platformConfig || !url) return null;

        const href = platformConfig.isMail ? formatEmailUrl(url) : url;

        return (
          <Link
            key={platform}
            href={href}
            target={platformConfig.isMail ? "_self" : "_blank"}
            rel={platformConfig.isMail ? undefined : "noopener noreferrer"}
            aria-label={`${platform} profile`}
            className={`flex size-9 items-center justify-center rounded-full bg-white transition-transform hover:scale-105 ${SOCIAL_ICON_COLORS[platform]}`}
          >
            {getSocialIcon(platform, 18)}
          </Link>
        );
      })}
    </div>
  );
}
