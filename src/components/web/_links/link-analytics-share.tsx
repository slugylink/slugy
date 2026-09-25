"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Check, Copy, Globe, CornerDownRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { mutate } from "swr";

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

/** Server-masked value meaning "a password is set, unchanged". */
const PASSWORD_MASK = "********";
const MIN_PASSWORD_LENGTH = 4;

interface SharedAnalyticsSettings {
  isPublic: boolean;
  allowIndexing: boolean;
  /** Masked when set server-side, plaintext only for a new password. */
  password?: string | null;
  publicId?: string | null;
  showLeads: boolean;
}

interface ShareResponse {
  isPublic: boolean;
  allowIndexing: boolean;
  password?: string | null;
  publicId?: string | null;
  showLeads: boolean;
}

interface ShareAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string;
  slug: string;
  url: string;
  /** Whether the link has conversion tracking on (lead data exists). */
  trackConversion?: boolean;
  onSettingsUpdated?: (settings: ShareResponse) => void;
}

type Status = "loading" | "ready" | "saving";

const EMPTY_SETTINGS: SharedAnalyticsSettings = {
  isPublic: false,
  allowIndexing: false,
  password: null,
  publicId: null,
  showLeads: false,
};

function shareUrlFor(publicId?: string | null): string | null {
  return publicId ? `https://slugy.co/share/${publicId}` : null;
}

export default function ShareAnalyticsModal({
  open,
  onOpenChange,
  linkId,
  slug,
  url,
  trackConversion = true,
  onSettingsUpdated,
}: ShareAnalyticsModalProps) {
  const { workspaceslug } = useWorkspaceStore();
  const router = useRouter();

  // `snapshot` = last server state, `draft` = editable copy. Save is only
  // enabled when they differ, so untouched opens never fire a request.
  const [snapshot, setSnapshot] =
    useState<SharedAnalyticsSettings>(EMPTY_SETTINGS);
  const [draft, setDraft] = useState<SharedAnalyticsSettings>(EMPTY_SETTINGS);
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Guards: ignore stale fetches when the modal is retargeted quickly,
  // and clean up the copy-feedback timer on unmount.
  const fetchIdRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!workspaceslug || !linkId) return;
    const fetchId = ++fetchIdRef.current;
    setStatus("loading");
    setLoadError(null);
    try {
      const response = await axios.get<ShareResponse>(
        `/api/workspace/${workspaceslug}/link/${linkId}/share`,
      );
      if (fetchIdRef.current !== fetchId) return;
      const server: SharedAnalyticsSettings = {
        isPublic: response.data.isPublic,
        allowIndexing: response.data.allowIndexing,
        password: response.data.password ?? null,
        publicId: response.data.publicId ?? null,
        showLeads: response.data.showLeads ?? false,
      };
      setSnapshot(server);
      setDraft(server);
      setStatus("ready");
    } catch (error) {
      if (fetchIdRef.current !== fetchId) return;
      console.error("Error fetching share settings:", error);
      setLoadError("Failed to load sharing settings. Please try again.");
      setStatus("ready");
      toast.error("Failed to load sharing settings");
    }
  }, [workspaceslug, linkId]);

  // Fresh state on every open — never flash the previous link's settings.
  useEffect(() => {
    if (open) {
      setSnapshot(EMPTY_SETTINGS);
      setDraft(EMPTY_SETTINGS);
      setIsCopied(false);
      setLoadError(null);
      setIsPasswordVisible(false);
      void fetchSettings();
    }
  }, [open, linkId, fetchSettings]);

  const passwordEnabled = draft.password !== null;
  const passwordValue = draft.password ?? "";
  const passwordInvalid =
    passwordEnabled &&
    passwordValue !== PASSWORD_MASK &&
    passwordValue.length < MIN_PASSWORD_LENGTH;

  const isDirty = useMemo(
    () => JSON.stringify(snapshot) !== JSON.stringify(draft),
    [snapshot, draft],
  );

  const shareUrl = draft.isPublic ? shareUrlFor(draft.publicId) : null;

  const saveSettings = async () => {
    if (!workspaceslug || !linkId || passwordInvalid) return;
    setStatus("saving");
    setLoadError(null);
    try {
      const response = await axios.post<ShareResponse>(
        `/api/workspace/${workspaceslug}/link/${linkId}/share`,
        {
          isPublic: draft.isPublic,
          allowIndexing: draft.allowIndexing,
          password: draft.password,
          showLeads: draft.showLeads,
        },
      );
      const saved: SharedAnalyticsSettings = {
        isPublic: response.data.isPublic,
        allowIndexing: response.data.allowIndexing,
        password: response.data.password ?? null,
        publicId: response.data.publicId ?? null,
        showLeads: response.data.showLeads ?? false,
      };
      setSnapshot(saved);
      setDraft(saved);
      toast.success("Share settings saved successfully!");
      // Refresh the links list so the shared-state badge updates.
      void mutate(
        (key) => typeof key === "string" && key.includes("/link/get"),
      );
      router.refresh();
      onSettingsUpdated?.(response.data);
    } catch (error) {
      console.error("Error saving share settings:", error);
      setLoadError("Failed to save share settings. Please try again.");
      toast.error("Failed to save share settings");
    } finally {
      setStatus((s) => (s === "saving" ? "ready" : s));
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setIsCopied(true);
        toast.success("Share link copied to clipboard");
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const handlePasswordToggle = (checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      // Turning it back on restores the server mask (keep existing)
      // instead of forcing the user to retype a password.
      password: checked ? (prev.password ?? snapshot.password ?? "") : null,
    }));
  };

  const handlePublicChange = (checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      isPublic: checked,
      // Private reports are never indexed and need no password.
      ...(checked === false && {
        password: null,
        allowIndexing: false,
      }),
    }));
  };

  const isBusy = status !== "ready";
  const isSaveDisabled = isBusy || !isDirty || passwordInvalid;
  const showLoading = status === "loading";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">
            Share Analytics
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Make your analytics dashboard available to others
          </DialogDescription>
        </DialogHeader>

        {loadError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {loadError}
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
            checked={draft.isPublic}
            onCheckedChange={handlePublicChange}
            disabled={isBusy}
            aria-label="Enable public sharing"
          />
        </div>

        {showLoading ? (
          <SkeletonShareUrl />
        ) : (
          shareUrl && (
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

        {draft.isPublic && !showLoading && (
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
                checked={passwordEnabled}
                onCheckedChange={handlePasswordToggle}
                disabled={isBusy}
                aria-label="Enable password protection"
              />
            </div>

            {passwordEnabled && (
              <div className="space-y-2">
                <div className="relative w-full">
                  <Input
                    type={isPasswordVisible ? "text" : "password"}
                    placeholder={
                      passwordValue === PASSWORD_MASK
                        ? "Password is set (type to change)"
                        : "Set password (min 4 characters)"
                    }
                    value={passwordValue}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    onFocus={(e) => {
                      // Selecting the mask on focus makes replacing it easy.
                      if (e.target.value === PASSWORD_MASK) e.target.select();
                    }}
                    className={`w-full pr-10 transition-all duration-200 ${
                      passwordInvalid
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    aria-invalid={passwordInvalid ? "true" : "false"}
                    aria-describedby={
                      passwordInvalid ? "password-error" : undefined
                    }
                  />
                  {isPasswordVisible ? (
                    <EyeOff
                      onClick={() => setIsPasswordVisible(false)}
                      className="text-muted-foreground absolute top-2.5 right-3 h-4 w-4 cursor-pointer"
                    />
                  ) : (
                    <Eye
                      onClick={() => setIsPasswordVisible(true)}
                      className="text-muted-foreground absolute top-2.5 right-3 h-4 w-4 cursor-pointer"
                    />
                  )}
                </div>
                {passwordInvalid && (
                  <p id="password-error" className="text-sm text-red-500">
                    Password must be at least 4 characters long
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="show-leads"
                  className="cursor-pointer font-normal"
                >
                  Include leads in report
                </Label>
                {!trackConversion && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Enable conversion tracking on this link first.
                  </p>
                )}
              </div>
              <Switch
                id="show-leads"
                checked={draft.showLeads}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, showLeads: checked }))
                }
                disabled={isBusy || !trackConversion}
                aria-label="Include leads in report"
              />
            </div>

            {/* <div className="flex items-center justify-between">
              <Label
                htmlFor="allow-indexing"
                className="cursor-pointer font-normal"
              >
                Allow search engine indexing
              </Label>
              <Switch
                id="allow-indexing"
                checked={draft.allowIndexing}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, allowIndexing: checked }))
                }
                disabled={isBusy}
                aria-label="Allow search engine indexing"
              />
            </div> */}
          </div>
        )}

        <Button
          className="w-full"
          onClick={saveSettings}
          disabled={isSaveDisabled}
        >
          {status === "saving" && (
            <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
          )}
          {isDirty ? "Save" : "Saved"}
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
