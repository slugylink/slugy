import type { SocialLinksProps, SocialPlatform } from "@/types/bio-links";
import { SOCIAL_PLATFORMS } from "@/constants/bio-links";
import { BIO_SOCIAL_ICON_MAP } from "@/constants/data/bio-icons";
import { formatEmailUrl } from "@/utils/bio-links";
import { getSocialIcon } from "./social-icons";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_SCROLL_THRESHOLD = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidSocial {
  platform: SocialPlatform;
  url: string;
  isPublic: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SocialLink({
  platform,
  url,
  keyPrefix,
}: {
  platform: SocialPlatform;
  url: string;
  keyPrefix: string;
}) {
  const platformConfig = SOCIAL_PLATFORMS[platform];
  if (!platformConfig) return null;

  const href = platformConfig.isMail ? formatEmailUrl(url) : url;
  const isMail = platformConfig.isMail;

  return (
    <Link
      key={`${keyPrefix}-${platform}`}
      href={href}
      target={isMail ? "_self" : "_blank"}
      rel={isMail ? undefined : "noopener noreferrer"}
      aria-label={`${platform} profile`}
      className={`flex size-9 items-center justify-center rounded-full bg-white transition-transform ${BIO_SOCIAL_ICON_MAP[platform]?.colorClass ?? "text-zinc-700"}`}
    >
      {getSocialIcon(platform, 18)}
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SocialLinks({ socials, theme }: SocialLinksProps) {
  const validSocials = socials.filter((s): s is ValidSocial =>
    Boolean(s.platform && s.url && s.platform in SOCIAL_PLATFORMS),
  );

  if (!validSocials.length) return null;

  const shouldAutoScroll = validSocials.length >= AUTO_SCROLL_THRESHOLD;

  if (!shouldAutoScroll) {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-1.5 ${theme.textColor}`}
      >
        {validSocials.map(({ platform, url }) => (
          <SocialLink
            key={platform}
            platform={platform}
            url={url}
            keyPrefix="static"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`social-marquee ${theme.textColor}`}>
      <div className="social-marquee-track">
        <div className="social-marquee-group">
          {validSocials.map(({ platform, url }) => (
            <SocialLink
              key={platform}
              platform={platform}
              url={url}
              keyPrefix="primary"
            />
          ))}
        </div>
        <div className="social-marquee-group" aria-hidden="true">
          {validSocials.map(({ platform, url }) => (
            <SocialLink
              key={platform}
              platform={platform}
              url={url}
              keyPrefix="clone"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
