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
import type { GalleryData, Theme } from "@/types/bio-links";
import { GLinkDialogBox } from "./add-glink-dialog";
import { ImagePlus, Pencil, Plus } from "lucide-react";
import { mutate } from "swr";
import { toast } from "sonner";
import { getAvatarUrl } from "@/utils/bio-links";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { cn } from "@/lib/utils";

type ViewMode = "full" | "preview";

interface GalleryProfileViewProps {
  gallery: GalleryData;
  theme: Theme;
  avatarUrl: string;
  mode?: ViewMode;
  showShareActions?: boolean;
  children?: ReactNode;
  /** Editor preview affordances (never enabled on public pages). */
  editable?: boolean;
  onEditBio?: () => void;
  onEditSocials?: () => void;
}

export { resolveGalleryTheme } from "@/constants/theme";

export default function GalleryProfileView({
  gallery,
  theme,
  avatarUrl,
  children,
  editable = false,
  onEditBio,
  onEditSocials,
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
    <div
      className={`relative mx-auto max-w-lg overflow-hidden rounded-[18px] border ${theme.background}`}
    >
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
              nameAction={
                editable && onEditBio ? (
                  <button
                    type="button"
                    onClick={onEditBio}
                    aria-label="Edit name and bio"
                    title="Edit name and bio"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full transition",
                      "text-zinc-400 hover:bg-black/5 hover:text-zinc-700",
                      "dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200",
                    )}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                ) : undefined
              }
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
              {editable && onEditSocials ? (
                <div className="flex flex-wrap items-center justify-start gap-2">
                  <SocialLinks
                    socials={socials}
                    theme={theme}
                    variant="header"
                  />
                  <button
                    type="button"
                    onClick={onEditSocials}
                    aria-label="Add or manage social links"
                    title="Add or manage social links"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border border-dashed transition",
                      "border-zinc-300 text-zinc-400 hover:border-zinc-500 hover:text-zinc-700",
                      "dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-zinc-400 dark:hover:text-zinc-200",
                    )}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ) : (
                <SocialLinks socials={socials} theme={theme} variant="header" />
              )}
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
