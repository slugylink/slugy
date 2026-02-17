"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { mutate } from "swr";
import { BIO_SOCIAL_ICONS } from "@/constants/data/bio-icons";

interface Social {
  platform: string;
  url?: string;
  isPublic?: boolean;
}

interface SocialSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  initialData?: Social[];
}

type SocialValues = Record<string, string>;
type SocialVisibility = Record<string, boolean>;
type ActivePlatforms = Record<string, boolean>;

const INITIAL_VALUES: SocialValues = Object.fromEntries(
  BIO_SOCIAL_ICONS.map((item) => [item.platform, ""]),
) as SocialValues;

const INITIAL_VISIBILITY: SocialVisibility = Object.fromEntries(
  BIO_SOCIAL_ICONS.map((item) => [item.platform, false]),
) as SocialVisibility;

const DEFAULT_VISIBLE_SOCIALS = BIO_SOCIAL_ICONS.slice(0, 5).map(
  (item) => item.platform,
);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function SocialSettingsDialog({
  open,
  onOpenChange,
  username,
  initialData,
}: SocialSettingsDialogProps) {
  const wasOpenRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<SocialValues>(INITIAL_VALUES);
  const [visibility, setVisibility] =
    useState<SocialVisibility>(INITIAL_VISIBILITY);
  const [initialValues, setInitialValues] =
    useState<SocialValues>(INITIAL_VALUES);
  const [initialVisibility, setInitialVisibility] =
    useState<SocialVisibility>(INITIAL_VISIBILITY);
  const [activePlatforms, setActivePlatforms] = useState<ActivePlatforms>({});
  const [platformSearch, setPlatformSearch] = useState("");

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) return;

    const nextValues = { ...INITIAL_VALUES };
    const nextVisibility = { ...INITIAL_VISIBILITY };
    const nextActivePlatforms: ActivePlatforms = Object.fromEntries(
      DEFAULT_VISIBLE_SOCIALS.map((platform) => [platform, true]),
    );

    (initialData ?? []).forEach((social) => {
      const platform = social.platform?.toLowerCase().trim();
      if (!platform || !(platform in nextValues)) return;

      nextValues[platform] = social.url ?? "";
      nextVisibility[platform] = Boolean(social.isPublic);

      if (social.isPublic) {
        nextActivePlatforms[platform] = true;
      }
    });

    setValues(nextValues);
    setVisibility(nextVisibility);
    setInitialValues(nextValues);
    setInitialVisibility(nextVisibility);
    setActivePlatforms(nextActivePlatforms);
    setPlatformSearch("");
  }, [initialData, open]);

  const visibleSocials = useMemo(
    () => BIO_SOCIAL_ICONS.filter((item) => activePlatforms[item.platform]),
    [activePlatforms],
  );

  const matchingSocialOptions = useMemo(() => {
    const query = platformSearch.trim().toLowerCase();
    if (!query) return [];

    return BIO_SOCIAL_ICONS.filter((item) => {
      if (activePlatforms[item.platform]) return false;

      return (
        item.label.toLowerCase().includes(query) ||
        item.platform.toLowerCase().includes(query)
      );
    }).slice(0, 12);
  }, [activePlatforms, platformSearch]);

  const isDirty = useMemo(
    () =>
      BIO_SOCIAL_ICONS.some(
        ({ platform }) =>
          values[platform] !== initialValues[platform] ||
          visibility[platform] !== initialVisibility[platform],
      ),
    [values, visibility, initialValues, initialVisibility],
  );

  const onSubmit = async () => {
    if (isSubmitting) return;

    const trimmedValues = Object.fromEntries(
      Object.entries(values).map(([platform, value]) => [
        platform,
        value.trim(),
      ]),
    ) as SocialValues;

    for (const item of BIO_SOCIAL_ICONS) {
      const currentValue = trimmedValues[item.platform];
      if (!currentValue) continue;

      if (item.isMail && !isValidEmail(currentValue)) {
        toast.error(`Invalid email for ${item.label}`);
        return;
      }

      if (!item.isMail && !isValidUrl(currentValue)) {
        toast.error(`Invalid URL for ${item.label}`);
        return;
      }
    }

    const socials = BIO_SOCIAL_ICONS.map((item) => ({
      platform: item.platform,
      url: trimmedValues[item.platform],
      isPublic: visibility[item.platform],
    })).filter((item) => item.url.length > 0);

    setIsSubmitting(true);
    try {
      await mutate(`/api/bio-gallery/${username}`);

      const response = await fetch(
        `/api/bio-gallery/${username}/update/socials`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ socials }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update social links");
      }

      await mutate(`/api/bio-gallery/${username}`);

      setInitialValues(trimmedValues);
      setInitialVisibility({ ...visibility });
      toast.success("Social links updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update social links");
      await mutate(`/api/bio-gallery/${username}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isSubmitting) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent className="scrollbar-hide max-h-[85vh] overflow-y-auto px-5 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Social Media Links</DialogTitle>
          <DialogDescription>
            Add your social media profiles to your gallery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative space-y-2">
            <Input
              placeholder="Search platform (e.g. Pinterest, Medium)"
              value={platformSearch}
              disabled={isSubmitting}
              onChange={(event) => setPlatformSearch(event.target.value)}
            />
            {platformSearch.trim().length > 0 && (
              <div className="bg-popover text-popover-foreground absolute top-10 right-0 left-0 z-10 max-h-48 overflow-y-auto rounded-md border shadow-md">
                {matchingSocialOptions.length > 0 ? (
                  matchingSocialOptions.map((item) => (
                    <button
                      key={item.platform}
                      type="button"
                      className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setActivePlatforms((prev) => ({
                          ...prev,
                          [item.platform]: true,
                        }));
                        setPlatformSearch("");
                      }}
                      disabled={isSubmitting}
                    >
                      <item.icon className={`h-4 w-4 ${item.colorClass}`} />
                      <span>{item.label}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-muted-foreground px-3 py-2 text-sm">
                    No platforms found
                  </p>
                )}
              </div>
            )}
          </div>

          {visibleSocials.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.platform} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${item.colorClass}`} />
                  <Input
                    placeholder={item.placeholder}
                    value={values[item.platform] ?? ""}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [item.platform]: event.target.value,
                      }))
                    }
                  />
                  <Switch
                    checked={visibility[item.platform] ?? false}
                    disabled={isSubmitting}
                    onCheckedChange={(checked) =>
                      setVisibility((prev) => ({
                        ...prev,
                        [item.platform]: checked,
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !isDirty}
            type="button"
            onClick={onSubmit}
          >
            {isSubmitting && (
              <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            )}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
