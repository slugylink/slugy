"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useThemeStore } from "@/store/theme-store";

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

const FeatureLinkPreview = ({
  username,
  links,
  initialTheme = "prism",
  name,
  bio,
}: GalleryLinkPreviewProps) => {
  const setTheme = useThemeStore((state) => state.setTheme);
  // Sync Zustand store with initialTheme from props
  React.useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme, setTheme]);

  // Demo: static theme config. Replace with dynamic config for more themes.
  const currentTheme = {
    id: "prism",
    name: "Prism",
    background: "bg-animated-rainbow",
    buttonStyle:
      "bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-lg transition-all duration-300",
    textColor: "text-white",
    accentColor: "text-white",
  };

  return (
    <>
      <div className="relative mx-auto flex w-fit flex-col items-start">
        {/* iPhone Frame Container */}
        <div className="relative mx-auto w-[280px]">
          {/* iPhone Notch */}
          <div className="absolute top-0 left-1/2 z-10 h-[28px] w-[118px] -translate-x-1/2 overflow-hidden rounded-b-xl bg-zinc-900"></div>

          {/* Device Frame */}
          <div className="relative w-full rounded-[45px] bg-zinc-900 p-[9px] shadow-[0_0_16px_rgba(0,0,0,0.1)]">
            {/* Screen Content */}
            <div
              className={`relative h-[380px] w-full rounded-[35px] ${currentTheme.background}`}
            >
              {/* Scrollable Content Container */}
              <div className="absolute inset-0 overflow-y-auto rounded-[40px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-col items-center space-y-1 px-4 pt-6 pb-8">
                  {/* Profile Image */}
                  <div className="relative mt-4">
                    <Image
                      src={"/icons/sandip.png"}
                      alt={name ?? username}
                      width={70}
                      height={70}
                      className="h-20 w-20 rounded-full object-cover p-2"
                    />
                  </div>

                  {/* Profile Info */}
                  <div className={`text-center ${currentTheme.textColor}`}>
                    <h2 className="text-xl font-medium">
                      {name ? name : `@${username}`}
                    </h2>
                    {bio && (
                      <p className={cn(currentTheme.accentColor, "text-sm")}>
                        {bio}
                      </p>
                    )}
                  </div>

                  {/* Navigation Link Buttons */}
                  <div className="w-full space-y-3 pt-4 text-sm">
                    {links.length === 0 ? (
                      <div className={`text-center ${currentTheme.textColor}`}>
                        <p>No links available.</p>
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
    </>
  );
};

export default FeatureLinkPreview;
