"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { themes } from "@/constants/theme";
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useThemeUpdate } from "@/hooks/use-theme-update";
import { useThemeStore } from "@/store/theme-store";

type Theme = {
  id: string;
  name: string;
  background: string;
  buttonStyle: string;
  textColor: string;
  accentColor: string;
  preview: string;
};

interface Link {
  id: string;
  title: string;
  url: string;
}

interface GalleryLinkPreviewProps {
  initialTheme?: string;
  onThemeChange?: (theme: string) => void;
  links: Link[];
  username: string;
  name?: string | null;
  bio?: string | null;
  logo?: string | null;
  socials?: {
    platform: string;
    url?: string;
    isPublic?: boolean;
  }[];
}

const getTheme = (themeId: string): Theme => {
  const found = themes.find((t) => t.id === themeId);
  if (!found) {
    // Default to music theme if not found
    return themes[0];
  }
  return found;
};

const GalleryLinkPreview = ({
  username,
  links,
  socials = [],
  initialTheme = "default",
  onThemeChange,
  name,
  bio,
  logo,
}: GalleryLinkPreviewProps) => {
  const {
    isSaving,
    pendingTheme,
    isDialogOpen,
    setIsDialogOpen,
    isSheetOpen,
    setIsSheetOpen,
    theme,
    handleThemeClick,
    handleConfirmTheme,
  } = useThemeUpdate(username, initialTheme, onThemeChange);
  const setTheme = useThemeStore((state) => state.setTheme);
  // Sync Zustand store with initialTheme from props
  React.useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme, setTheme]);
  const currentTheme = getTheme(theme);

  return (
    <>
      <div className="relative flex w-fit flex-col items-start">
        {/* iPhone Frame Container */}
        <div className="relative mx-auto w-[305px]">
          {/* iPhone Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-[30px] w-[118px] -translate-x-1/2 overflow-hidden rounded-b-xl bg-zinc-900"></div>

          {/* Device Frame */}
          <div className="relative w-full rounded-[45px] bg-zinc-900 p-[9px] shadow-[0_0_30px_rgba(0,0,0,0.3)] dark:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {/* Screen Border */}

            {/* Screen Content */}
            <div
              className={`relative h-[585px] w-full rounded-[35px] ${currentTheme.background}`}
            >
              {/* Scrollable Content Container */}
              <div className="absolute inset-0 overflow-y-auto rounded-[40px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-col items-center space-y-4 px-4 pb-8 pt-8">
                  {/* Profile Image */}
                  <div className="relative mt-4">
                    <Image
                      src={logo ? logo : `https://avatar.vercel.sh/${username}`}
                      alt={name ?? username}
                      width={70}
                      height={70}
                      className="h-20 w-20 rounded-full border-2 border-zinc-200 bg-white object-cover"
                    />
                  </div>

                  {/* Profile Info */}
                  <div className={`text-center ${currentTheme.textColor}`}>
                    <h2 className="text-xl font-semibold">
                      {name ? name : `@${username}`}
                    </h2>
                    {bio && (
                      <p className={cn(currentTheme.accentColor, "text-sm")}>
                        {bio ?? ""}
                      </p>
                    )}
                  </div>

                  {/* Social Media Icons */}
                  <div className={`flex space-x-4 ${currentTheme.textColor}`}>
                    {socials.map((social) => {
                      if (!social.url || !social.isPublic) return null;
                      let icon = null;
                      let href = social.url;

                      // Special handling for mail platform
                      if (social.platform === "mail") {
                        // Check if the URL already has mailto: prefix
                        if (!href.startsWith("mailto:")) {
                          href = `mailto:${href}`;
                        }
                      }

                      switch (social.platform) {
                        case "facebook":
                          icon = <RiFacebookFill size={18} />;
                          break;
                        case "instagram":
                          icon = <RiInstagramLine size={18} />;
                          break;
                        case "twitter":
                          icon = <RiTwitterXFill size={18} />;
                          break;
                        case "linkedin":
                          icon = <RiLinkedinFill size={19} />;
                          break;
                        case "youtube":
                          icon = <RiYoutubeFill size={18} />;
                          break;
                        case "mail":
                          icon = <LuMail size={18} />;
                          break;
                        case "snapchat":
                          icon = <RiSnapchatFill size={18} />;
                          break;
                        default:
                          return null;
                      }

                      return (
                        <a
                          key={social.platform}
                          href={href}
                          target={
                            social.platform === "mail" ? "_self" : "_blank"
                          }
                          rel={
                            social.platform === "mail"
                              ? ""
                              : "noopener noreferrer"
                          }
                          className="transition hover:opacity-80"
                          aria-label={`${social.platform} profile`}
                        >
                          {icon}
                        </a>
                      );
                    })}
                  </div>

                  {/* Navigation Link Buttons */}
                  <div className="w-full space-y-3 pt-4 text-sm">
                    {links.length === 0 ? (
                      <div className={`text-center ${currentTheme.textColor}`}>
                        <p></p>
                      </div>
                    ) : (
                      links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex w-full items-center justify-center rounded-full px-4 py-[10px] text-center transition ${currentTheme.buttonStyle}`}
                        >
                          {link.title}
                        </a>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-1 left-1/2 h-1 w-[120px] -translate-x-1/2 rounded-full bg-black"></div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle className="text-xl font-medium">Choose a Theme</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto py-4 pr-2 sm:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                className={cn(
                  "group hover:border-primary relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all mb-10",
                  t.id === theme
                    ? "border-primary ring-primary ring-2 ring-offset-2"
                    : "border-muted-foreground/20",
                )}
                onClick={() => handleThemeClick(t.id, theme)}
              >
                {/* Theme Preview */}
                <div className={cn("h-full w-full", t.background)}>
                  {/* Mock Content */}
                  <div className="flex flex-col items-center gap-0.5 p-1.5">
                    <div className="h-4 w-4 rounded-full bg-zinc-300/20" />
                    <div className="h-2 w-8 rounded-full bg-zinc-300/20" />
                    <div className="mt-1 space-y-0.5">
                      <div className="h-4 w-full rounded-full bg-zinc-300/20" />
                      <div className="h-4 w-full rounded-full bg-zinc-300/20" />
                      <div className="h-4 w-full rounded-full bg-zinc-300/20" />
                    </div>
                  </div>
                </div>
                {/* Theme Name */}
                <div
                  className={cn(
                    "absolute bottom-0.5 left-0.5 rounded bg-black/80 px-1 py-0.5 text-xs text-white",
                    t.id === theme && "bg-primary",
                  )}
                >
                  {t.name}
                </div>
                {/* Selected Check */}
                {t.id === theme && (
                  <div className="bg-primary absolute top-0.5 right-0.5 rounded-full p-0.5">
                    <Check className="text-primary-foreground h-2.5 w-2.5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      {/* Confirm Theme Change Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white sm:max-w-[425px] dark:bg-black">
          <DialogHeader>
            <DialogTitle>Change Theme?</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to change your theme to{" "}
            <b>
              {pendingTheme && themes.find((t) => t.id === pendingTheme)?.name}
            </b>
            ?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmTheme} disabled={isSaving}>
              {isSaving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GalleryLinkPreview;
