"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import SocialLinks from "@/components/web/_bio-links/social-links";
import ProfileSection from "@/components/web/_bio-links/profile-section";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";
import { themes } from "@/constants/theme";
import { DEFAULT_THEME_ID } from "@/constants/bio-links";
import type { GalleryData, Theme } from "@/types/bio-links";
import { GLinkDialogBox } from "./add-glink-dialog";
import { ImagePlus } from "lucide-react";
import { mutate } from "swr";
import { toast } from "sonner";
import { getAvatarUrl } from "@/utils/bio-links";
import { LoaderCircle } from "@/utils/icons/loader-circle";

type ViewMode = "full" | "preview";

interface GalleryProfileViewProps {
  gallery: GalleryData;
  theme: Theme;
  avatarUrl: string;
  mode?: ViewMode;
  showShareActions?: boolean;
  children?: ReactNode;
}

export function resolveGalleryTheme(
  themeId: string | Theme | null | undefined,
): Theme {
  const fallbackTheme =
    themes.find((theme) => theme.id === DEFAULT_THEME_ID) ?? themes[0];
  const resolvedThemeId = typeof themeId === "string" ? themeId : themeId?.id;
  const selectedTheme =
    themes.find((theme) => theme.id === resolvedThemeId) ?? fallbackTheme;

  if (
    !selectedTheme?.background ||
    !selectedTheme?.textColor ||
    !selectedTheme?.buttonStyle
  ) {
    return fallbackTheme;
  }

  return selectedTheme;
}

export default function GalleryProfileView({
  gallery,
  theme,
  avatarUrl,
  children,
}: GalleryProfileViewProps) {
  const socials = gallery.socials ?? [];
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploadingImage) return;

    setIsUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `/api/bio-gallery/${gallery.username}/update/logo`,
        {
          method: "PATCH",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = (await response.json()) as { logo: string | null };
      setCurrentAvatarUrl(getAvatarUrl(data.logo, gallery.username));
      await mutate(`/api/bio-gallery/${gallery.username}`);
      toast.success("Profile image updated");
    } catch {
      toast.error("Failed to upload image");
      await mutate(`/api/bio-gallery/${gallery.username}`);
    } finally {
      setIsUploadingImage(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <div className="relative mx-auto max-w-lg overflow-hidden rounded-[18px] border bg-[#f6f6f7] bg-[radial-gradient(#e4e3e6_1.15px,transparent_1.15px)] bg-[size:18px_18px]">
      <div className="relative z-10 mx-auto w-full">
        <div className="relative w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploadingImage}
          />

          <div className="px-6 pt-8 pb-2">
            <ProfileSection
              name={gallery.name}
              username={gallery.username}
              bio={gallery.bio}
              theme={theme}
              avatarUrl={currentAvatarUrl}
              layout="split"
              avatarOverlay={
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition hover:bg-black/40 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Upload profile image"
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus strokeWidth={1.5} size={22} />
                  )}
                </button>
              }
            >
              <SocialLinks socials={socials} theme={theme} variant="header" />
            </ProfileSection>
          </div>

          <div className="px-4">
            <GLinkDialogBox username={gallery.username} />
          </div>

          <div className="relative z-10 space-y-4 px-4 pt-4 pb-16 sm:pb-20">
            {children}
          </div>
          <GalleryFooter placement="absolute" />
        </div>
      </div>
    </div>
  );
}
