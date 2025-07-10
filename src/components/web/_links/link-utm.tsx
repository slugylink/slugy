"use client";
import {
  Globe,
  Target,
  Flag,
  MessageSquare,
  FileText,
  Link2,
  DiamondPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referral: string;
}

const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch {
    try {
      new URL(`https://${urlString}`);
      return true;
    } catch {
      return false;
    }
  }
};

const parseUTMParams = (url: string): UTMParams => {
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
}: {
  url: string;
  setValue: (field: string, value: string) => void;
  utmOpen: boolean;
  setUtmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  params: UTMParams;
  setParams: React.Dispatch<React.SetStateAction<UTMParams>>;
}) {
  const generatePreviewURL = () => {
    try {
      // Ensure URL has protocol
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
    if (isValidUrl(baseUrl)) {
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

  useEffect(() => {
    if (utmOpen && baseUrl && isValidUrl(baseUrl)) {
      const parsedParams = parseUTMParams(baseUrl);
      setParams(parsedParams);
    }
  }, [utmOpen, baseUrl, setParams]);

  return (
    <Dialog open={utmOpen} onOpenChange={setUtmOpen}>
      <DialogTrigger asChild>
        <Button className="text-xs" type="button" variant="outline" size="sm">
          <DiamondPlus  className={cn("p-[1px] font-medium", params.source && "text-blue-500")} size={8} />
          UTM
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>UTM Builder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
            <div className="grid gap-3">
              <div className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <Globe className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Source</span>
                </div>
                <Input
                  placeholder="google"
                  value={params.source}
                  onChange={handleInputChange("source")}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <Target className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Medium</span>
                </div>
                <Input
                  placeholder="cpc"
                  value={params.medium}
                  onChange={handleInputChange("medium")}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <Flag className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Campaign</span>
                </div>
                <Input
                  placeholder="summer_sale"
                  value={params.campaign}
                  onChange={handleInputChange("campaign")}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <MessageSquare className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Term</span>
                </div>
                <Input
                  placeholder="running shoes"
                  value={params.term}
                  onChange={handleInputChange("term")}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <FileText className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Content</span>
                </div>
                <Input
                  placeholder="logolink"
                  value={params.content}
                  onChange={handleInputChange("content")}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex w-24 items-center gap-2">
                  <Link2 className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Referral</span>
                </div>
                <Input
                  placeholder="yoursite.com"
                  value={params.referral}
                  onChange={handleInputChange("referral")}
                  className="flex-1"
                />
              </div>
            </div>
            {baseUrl && isValidUrl(baseUrl) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">URL Preview</label>
                <div className="bg-muted rounded-md p-2 mt-2">
                  <code className="text-xs break-all">
                    {generatePreviewURL()}
                  </code>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <div className="mt-3 space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  disabled={!baseUrl || !isValidUrl(baseUrl)}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
    </Dialog>
  );
}
