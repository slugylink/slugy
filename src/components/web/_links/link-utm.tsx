"use client";
import { DiamondPlus, ChevronDown, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import {
  toUtmParams,
  UTM_FIELDS,
  type UtmTemplate,
} from "@/constants/utm-fields";

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referral: string;
}

const isValidUrl = (urlString: string): boolean => {
  if (!urlString || typeof urlString !== "string") return false;

  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) return false;

  // Fast regex check first to avoid expensive URL constructor
  const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
  if (urlPattern.test(trimmedUrl)) return true;

  // Try with https prefix
  const withHttps = `https://${trimmedUrl}`;
  if (urlPattern.test(withHttps)) return true;

  // Only use URL constructor as last resort
  try {
    const urlWithProtocol = trimmedUrl.startsWith("http")
      ? trimmedUrl
      : `https://${trimmedUrl}`;
    new URL(urlWithProtocol);
    return true;
  } catch {
    return false;
  }
};

const parseUTMParams = (url: string): UTMParams => {
  // Fast regex check before expensive URL parsing
  if (!url || !url.includes("?")) {
    return {
      source: "",
      medium: "",
      campaign: "",
      term: "",
      content: "",
      referral: "",
    };
  }

  try {
    // Ensure URL has protocol
    const urlWithProtocol = !/^https?:\/\//i.test(url) ? `https://${url}` : url;
    const parsedUrl = new URL(urlWithProtocol);

    return {
      source: parsedUrl.searchParams.get("utm_source") ?? "",
      medium: parsedUrl.searchParams.get("utm_medium") ?? "",
      campaign: parsedUrl.searchParams.get("utm_campaign") ?? "",
      term: parsedUrl.searchParams.get("utm_term") ?? "",
      content: parsedUrl.searchParams.get("utm_content") ?? "",
      referral: parsedUrl.searchParams.get("ref") ?? "",
    };
  } catch {
    // Return empty params if URL parsing fails
    return {
      source: "",
      medium: "",
      campaign: "",
      term: "",
      content: "",
      referral: "",
    };
  }
};

export default function UTMBuilderDialog({
  url: baseUrl,
  setValue,
  utmOpen,
  setUtmOpen,
  params,
  setParams,
  workspaceslug,
}: {
  url: string;
  setValue: (field: string, value: string) => void;
  utmOpen: boolean;
  setUtmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  params: UTMParams;
  setParams: React.Dispatch<React.SetStateAction<UTMParams>>;
  workspaceslug?: string;
}) {
  const { data: templates, isLoading: isLoadingTemplates } = useSWR<
    UtmTemplate[]
  >(
    utmOpen && workspaceslug
      ? `/api/workspace/${workspaceslug}/utm-templates`
      : null,
  );

  const generatePreviewURL = () => {
    if (!baseUrl) return baseUrl;

    try {
      // Fast check for URLs without query params
      if (!baseUrl.includes("?")) {
        const urlWithProtocol = !/^https?:\/\//i.test(baseUrl)
          ? `https://${baseUrl}`
          : baseUrl;

        const utmParams = new URLSearchParams();
        if (params.source) utmParams.append("utm_source", params.source);
        if (params.medium) utmParams.append("utm_medium", params.medium);
        if (params.campaign) utmParams.append("utm_campaign", params.campaign);
        if (params.term) utmParams.append("utm_term", params.term);
        if (params.content) utmParams.append("utm_content", params.content);
        if (params.referral) utmParams.append("ref", params.referral);

        return `${urlWithProtocol}${utmParams.toString() ? "?" + utmParams.toString() : ""}`;
      }

      // For URLs with existing query params, use URL constructor
      const urlWithProtocol = !/^https?:\/\//i.test(baseUrl)
        ? `https://${baseUrl}`
        : baseUrl;
      const parsedUrl = new URL(urlWithProtocol);
      const baseUrlWithoutParams = parsedUrl.origin + parsedUrl.pathname;
      const utmParams = new URLSearchParams();

      if (params.source) utmParams.append("utm_source", params.source);
      if (params.medium) utmParams.append("utm_medium", params.medium);
      if (params.campaign) utmParams.append("utm_campaign", params.campaign);
      if (params.term) utmParams.append("utm_term", params.term);
      if (params.content) utmParams.append("utm_content", params.content);
      if (params.referral) utmParams.append("ref", params.referral);

      return `${baseUrlWithoutParams}${utmParams.toString() ? "?" + utmParams.toString() : ""}`;
    } catch {
      // Return original URL if parsing fails
      return baseUrl;
    }
  };

  const handleInputChange =
    (key: keyof UTMParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setParams((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSave = () => {
    const trimmedUrl = baseUrl?.trim();
    if (trimmedUrl && isValidUrl(trimmedUrl)) {
      setValue("url", generatePreviewURL());
    }
    setUtmOpen(false);
  };

  const handleCancel = () => {
    setUtmOpen(false);
    setParams({
      source: "",
      medium: "",
      campaign: "",
      term: "",
      content: "",
      referral: "",
    });
  };

  const applyTemplate = (template: UtmTemplate) => {
    setParams(toUtmParams(template));
  };

  useEffect(() => {
    if (utmOpen) {
      if (baseUrl && isValidUrl(baseUrl)) {
        const parsedParams = parseUTMParams(baseUrl);
        setParams(parsedParams);
      } else if (baseUrl) {
        // Reset to empty params if URL is invalid
        setParams({
          source: "",
          medium: "",
          campaign: "",
          term: "",
          content: "",
          referral: "",
        });
      }
    }
  }, [utmOpen, baseUrl, setParams]);

  return (
    <Dialog open={utmOpen} onOpenChange={setUtmOpen}>
      <DialogTrigger asChild>
        <Button className="text-xs" type="button" variant="outline" size="sm">
          <DiamondPlus
            className={cn(
              "p-[1px] font-medium",
              params.source && "text-blue-500",
            )}
            size={8}
          />
          UTM
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px]! px-4">
        <DialogHeader className="mb-4">
          <DialogTitle>UTM Builder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            {UTM_FIELDS.map(({ key, label, placeholder, icon: Icon }) => (
              <div
                key={key}
                className="focus-within:ring-ring flex items-center overflow-hidden rounded-lg border focus-within:ring-1"
              >
                <div className="text-muted-foreground flex w-[120px] shrink-0 items-center gap-2 border-r px-3 py-2 text-sm">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
                <Input
                  placeholder={placeholder}
                  value={params[key]}
                  onChange={handleInputChange(key)}
                  className="h-9 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            ))}
          </div>
          {baseUrl && isValidUrl(baseUrl) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">URL Preview</label>
              <div className="bg-muted mt-2 rounded-md p-2">
                <code className="text-xs break-all">
                  {generatePreviewURL()}
                </code>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={!workspaceslug}
                >
                  <DiamondPlus className="h-3.5 w-3.5" />
                  Templates
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>UTM Templates</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isLoadingTemplates ? (
                  <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                ) : templates && templates.length > 0 ? (
                  templates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      className="cursor-pointer"
                      onClick={() => applyTemplate(template)}
                    >
                      <DiamondPlus className="h-3.5 w-3.5" />
                      <span className="truncate">{template.name}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${workspaceslug}/settings/library/utm-template`}
                      target="_blank"
                      className="cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create a template</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/${workspaceslug}/settings/library/utm-template`}
                    className="cursor-pointer"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Manage templates</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
