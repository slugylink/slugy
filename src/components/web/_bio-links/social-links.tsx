import type { BioSocials } from "@prisma/client";
import type { SocialLinksProps, SocialPlatform } from "@/types/bio-links";
import { SOCIAL_PLATFORMS } from "@/constants/bio-links";
import { getSocialIcon } from "./social-icons";
import { formatEmailUrl } from "@/utils/bio-links";

export default function SocialLinks({ socials, theme }: SocialLinksProps) {
  const validSocials = socials.filter(
    (s): s is BioSocials & { platform: SocialPlatform } =>
      Boolean(s.platform && s.url && s.platform in SOCIAL_PLATFORMS),
  );

  if (!validSocials.length) return null;

  return (
    <div
      className={`flex items-center justify-center space-x-4 ${theme.textColor}`}
    >
      {validSocials.map(({ platform, url }) => {
        const platformConfig = SOCIAL_PLATFORMS[platform];

        if (!platformConfig || !url) return null;

        const href = platformConfig.isMail ? formatEmailUrl(url) : url;

        return (
          <a
            key={platform}
            href={href}
            target={platformConfig.isMail ? "_self" : "_blank"}
            rel={platformConfig.isMail ? undefined : "noopener noreferrer"}
            aria-label={`${platform} profile`}
          >
            {getSocialIcon(platform, 20)}
          </a>
        );
      })}
    </div>
  );
}
