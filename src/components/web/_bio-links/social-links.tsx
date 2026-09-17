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
  variant = "default",
}: {
  platform: SocialPlatform;
  url: string;
  keyPrefix: string;
  variant?: "default" | "header";
}) {
  const platformConfig = SOCIAL_PLATFORMS[platform];
  if (!platformConfig) return null;

  const href = platformConfig.isMail ? formatEmailUrl(url) : url;
  const isMail = platformConfig.isMail;
  const isHeader = variant === "header";

  return (
    <Link
      key={`${keyPrefix}-${platform}`}
      href={href}
      target={isMail ? "_self" : "_blank"}
      rel={isMail ? undefined : "noopener noreferrer"}
      aria-label={`${platform} profile`}
      className={
        isHeader
          ? "flex size-9 items-center justify-center rounded-full bg-[#e3e4e6] text-zinc-800 transition-transform hover:scale-[1.03]"
          : `flex size-6 items-center justify-center rounded-full bg-white transition-transform ${BIO_SOCIAL_ICON_MAP[platform]?.colorClass ?? "text-zinc-700"}`
      }
    >
      {getSocialIcon(platform, isHeader ? 17 : 18)}
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SocialLinks({
  socials,
  theme,
  variant = "default",
}: SocialLinksProps) {
  const validSocials = socials.filter((s): s is ValidSocial =>
    Boolean(s.platform && s.url && s.platform in SOCIAL_PLATFORMS),
  );

  if (!validSocials.length) return null;

  const shouldAutoScroll =
    variant !== "header" && validSocials.length >= AUTO_SCROLL_THRESHOLD;
  const isHeader = variant === "header";

  if (!shouldAutoScroll) {
    return (
      <div
        className={
          isHeader
            ? "flex flex-wrap items-center justify-start gap-2"
            : `flex flex-wrap items-center justify-center gap-1.5 ${theme.textColor}`
        }
      >
        {validSocials.map(({ platform, url }) => (
          <SocialLink
            key={platform}
            platform={platform}
            url={url}
            keyPrefix="static"
            variant={variant}
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
