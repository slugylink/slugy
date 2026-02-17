"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
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
  mode = "full",
  children,
}: GalleryProfileViewProps) {
  const isPreview = mode === "preview";
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
    } catch (error) {
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
    <div className={"relative rounded-2xl"}>
      <div className="relative z-10 mx-auto w-full rounded-2xl bg-transparent md:max-w-lg">
        <div className="relative w-full overflow-hidden rounded-2xl">
          <div
            className={"relative z-0 h-[420px] overflow-hidden sm:h-[520px]"}
          >
            <Image
              src={currentAvatarUrl}
              alt={`${gallery.name}'s profile image`}
              fill
              className="object-cover"
              priority={!isPreview}
              sizes={"(max-width: 768px) 100vw, 680px"}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />
          </div>

          <div className={"relative z-[5] -mt-[360px] h-[360px]"}>
            <ProfileSection
              name={gallery.name}
              username={gallery.username}
              bio={gallery.bio}
              theme={theme}
            >
              <SocialLinks socials={socials} theme={theme} />
            </ProfileSection>
          </div>

          <div className="absolute bottom-[65%] left-1/2 z-20! -mt-[360px] flex h-[100px] -translate-x-1/2 items-center justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer items-center justify-center rounded-full bg-zinc-50/40 text-white transition hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Upload profile image"
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus strokeWidth={1.5} size={40} className="p-2" />
              )}
            </button>
          </div>

          <div>
            <GLinkDialogBox username={gallery.username} />
          </div>

          <div className="relative z-10 space-y-4 bg-black px-4 pb-6 text-white sm:pb-7">
            {children}
            <GalleryFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
