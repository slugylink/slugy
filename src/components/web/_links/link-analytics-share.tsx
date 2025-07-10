"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Copy, Globe, CornerDownRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UrlAvatar from "@/components/web/url-avatar";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { useWorkspaceStore } from "@/store/workspace";

interface SharedAnalyticsSettings {
  isPublic: boolean;
  allowIndexing: boolean;
  password?: string | null;
  publicId?: string;
}

interface ShareResponse {
  isPublic: boolean;
  allowIndexing: boolean;
  password?: string | null;
  publicId?: string;
}

interface ShareAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string;
  slug: string;
  url: string;
  onSettingsUpdated?: (settings: ShareResponse) => void;
}

export default function ShareAnalyticsModal({
  open,
  onOpenChange,
  linkId,
  slug,
  url,
  onSettingsUpdated,
}: ShareAnalyticsModalProps) {
  const { workspaceslug } = useWorkspaceStore();
  const [settings, setSettings] = useState<SharedAnalyticsSettings>({
    isPublic: true,
    allowIndexing: false,
    password: null,
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Validate password when it changes
  useEffect(() => {
    if (settings.password !== null && settings.password !== undefined) {
      if (settings.password.length < 4) {
        setPasswordError("Password must be at least 4 characters long");
      } else {
        setPasswordError(null);
      }
    } else {
      setPasswordError(null);
    }
  }, [settings.password]);

  const fetchSettings = useCallback(async () => {
    if (!workspaceslug || !linkId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get<ShareResponse>(
        `/api/workspace/${workspaceslug}/link/${linkId}/share`,
      );

      if (response.data) {
        setSettings(response.data);
        if (response.data.publicId) {
          setShareUrl(`https://slugy.co/share/${response.data.publicId}`);
        }
      }
    } catch (error) {
      console.error("Error fetching share settings:", error);
      setError("Failed to load sharing settings. Please try again.");
      toast.error("Failed to load sharing settings");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceslug, linkId]);

  // Fetch settings when modal opens
  useEffect(() => {
    if (open) {
      void fetchSettings();
    }
  }, [open, fetchSettings]);

  const saveSettings = async () => {
    if (!workspaceslug || !linkId) {
      toast.error("Missing workspace or link information");
      return;
    }

    // Validate password before saving
    if (
      settings.password !== null &&
      settings.password !== undefined &&
      settings.password.length < 4
    ) {
      setError("Password must be at least 4 characters");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await axios.post<ShareResponse>(
        `/api/workspace/${workspaceslug}/link/${linkId}/share`,
        settings,
      );

      if (response.data?.publicId) {
        const newShareUrl = `https://slugy.co/share/${response.data.publicId}`;
        setShareUrl(newShareUrl);
        setSettings(response.data);
        toast.success("Share settings saved successfully!");
        router.refresh();
        // Call the callback with updated settings
        if (onSettingsUpdated) {
          onSettingsUpdated(response.data);
        }
      } else {
        throw new Error("No public ID returned from server");
      }
    } catch (error) {
      console.error("Error saving share settings:", error);
      setError("Failed to save share settings. Please try again.");
      toast.error("Failed to save share settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setIsCopied(true);
        toast.success("Share link copied to clipboard");
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsCopied(false);
      setError(null);
    }
  }, [open]);

  const handlePasswordChange = (checked: boolean) => {
    setSettings({
      ...settings,
      password: checked ? "" : null,
    });
  };

  const handlePublicChange = (checked: boolean) => {
    setSettings({
      ...settings,
      isPublic: checked,
      // Reset password if making private
      ...(checked === false && { password: null }),
    });
  };

  const handleTogglePassword = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Check if save button should be disabled
  const isSaveDisabled =
    isSaving ||
    (settings.password !== null &&
      settings.password !== undefined &&
      settings.password.length < 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Share Analytics</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make your analytics dashboard available to others
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex w-full flex-row items-start space-y-0 rounded-xl border p-4 transition-all hover:shadow-[0_20px_35px_-15px_rgba(0,0,0,0.1)] sm:items-center sm:space-x-4">
          <div className="hidden rounded-full sm:block">
            <UrlAvatar url={url} />
          </div>
          <div className="max-w-xs min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 sm:flex-row">
              <p className="text-sm leading-none font-medium">
                slugy.co/{slug}
              </p>
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <CornerDownRight strokeWidth={1.5} size={15} />
              <p className="text-muted-foreground max-w-[calc(100%-3rem)] truncate">
                {url
                  .replace("https://", "")
                  .replace("http://", "")
                  .replace("www.", "")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Globe className="h-[15px] w-[15px]" />
            <Label
              htmlFor="public-sharing"
              className="cursor-pointer font-normal"
            >
              Enable public sharing
            </Label>
          </div>
          <Switch
            id="public-sharing"
            checked={settings.isPublic}
            onCheckedChange={handlePublicChange}
            aria-label="Enable public sharing"
          />
        </div>

        {isLoading && !shareUrl && settings.isPublic ? (
          <SkeletonShareUrl />
        ) : (
          shareUrl &&
          settings.isPublic && (
            <div className="flex items-center space-x-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                aria-label={isCopied ? "Copied" : "Copy to clipboard"}
                className="flex-shrink-0"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )
        )}

        {settings.isPublic && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Settings</h3>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="password-protection"
                className="cursor-pointer font-normal"
              >
                Password protection
              </Label>
              <Switch
                id="password-protection"
                checked={settings.password !== null}
                onCheckedChange={handlePasswordChange}
                aria-label="Enable password protection"
              />
            </div>

            {settings.password !== null && (
              <div className="space-y-2">
                <div className="relative w-full">
                  <Input
                    type={isPasswordVisible ? "text" : "password"}
                    placeholder="Set password (min 4 characters)"
                    value={settings.password ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, password: e.target.value })
                    }
                    className={`w-full pr-10 transition-all duration-200 ${
                      passwordError
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    aria-invalid={passwordError ? "true" : "false"}
                    aria-describedby={
                      passwordError ? "password-error" : undefined
                    }
                  />
                  {isPasswordVisible ? (
                    <EyeOff
                      onClick={handleTogglePassword}
                      className="text-muted-foreground absolute top-2.5 right-3 h-4 w-4 cursor-pointer"
                    />
                  ) : (
                    <Eye
                      onClick={handleTogglePassword}
                      className="text-muted-foreground absolute top-2.5 right-3 h-4 w-4 cursor-pointer"
                    />
                  )}
                </div>
                {passwordError && (
                  <p id="password-error" className="text-sm text-red-500">
                    {passwordError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={saveSettings}
          disabled={isSaveDisabled}
        >
          {isSaving && <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonShareUrl() {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-10 flex-1 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-10 w-10 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
