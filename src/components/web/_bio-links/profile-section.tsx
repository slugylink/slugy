import Image from "next/image";
import type { ProfileSectionProps } from "@/types/bio-links";
import { getAvatarUrl, getDisplayName } from "@/utils/bio-links";

export default function ProfileSection({
  name,
  username,
  bio,
  logo,
  theme
}: ProfileSectionProps) {
  const displayName = getDisplayName(name, username);
  const avatarUrl = getAvatarUrl(logo, username);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Profile Image */}
      <div className="relative mt-4">
        <Image
          src={avatarUrl}
          alt={`${displayName}'s profile picture`}
          width={96}
          height={96}
          className="h-[88px] w-[88px] rounded-full object-cover"
          priority
          sizes="88px"
        />
      </div>

      {/* Profile Info */}
      <div className={`space-y-2 text-center ${theme.textColor}`}>
        <h1 className="text-xl font-medium">
          {displayName}
        </h1>
        {bio && (
          <p className={`${theme.accentColor} max-w-sm text-sm`}>
            {bio}
          </p>
        )}
      </div>
    </div>
  );
}
