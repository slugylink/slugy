"use client";

import { useState, type ReactNode, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  Chrome,
  Download,
  EllipsisVertical,
  Flag,
  ListFilter,
  Loader2,
  LoaderCircle,
  Lock,
  QrCode,
  Search,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import ContinentFlag from "./continent-flag";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
import UrlAvatar from "@/components/web/url-avatar";
import CountryFlag from "./country-flag";
import FilterSelectedButtons from "./filter-selected-buttons";
import { useQueryState, parseAsString, parseAsArrayOf } from "nuqs";
import { useSubscriptionStore } from "@/store/subscription";
import { HiSparkles } from "react-icons/hi2";
import type { AskAiResult } from "@/lib/ai/analytics-ask-prompt";
import { triggerLabel } from "@/lib/ai/analytics-ask-prompt";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BaseOption {
  clicks?: number;
}

interface LinkAnalytics extends BaseOption {
  slug: string;
  url: string;
  icon?: string;
}

interface ContinentAnalytics extends BaseOption {
  continent: string;
}

interface CountryAnalytics extends BaseOption {
  country: string;
}

interface CityAnalytics extends BaseOption {
  city: string;
  country: string;
}

interface BrowserAnalytics extends BaseOption {
  browser: string;
}

interface OsAnalytics extends BaseOption {
  os: string;
}

interface DeviceAnalytics extends BaseOption {
  device: string;
}

interface ReferrerAnalytics extends BaseOption {
  referrer: string;
}

interface TriggerAnalytics extends BaseOption {
  trigger: string;
}

interface DestinationAnalytics extends BaseOption {
  destination: string;
}

type FilterOption =
  | LinkAnalytics
  | ContinentAnalytics
  | CountryAnalytics
  | CityAnalytics
  | BrowserAnalytics
  | OsAnalytics
  | DeviceAnalytics
  | ReferrerAnalytics
  | TriggerAnalytics
  | DestinationAnalytics;

export type CategoryId =
  | "slug_key"
  | "destination_key"
  | "country_key"
  | "continent_key"
  | "city_key"
  | "device_key"
  | "browser_key"
  | "os_key"
  | "referrer_key"
  | "trigger_key";

export interface FilterCategory {
  id: CategoryId;
  label: string;
  icon: ReactNode;
  options: FilterOption[];
}

interface FilterActionsProps {
  filterCategories: FilterCategory[];
}

const OptimizedImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Image
      src={
        error
          ? "https://slugylink.github.io/slugy-assets/dist/colorful/browser/default.svg"
          : src || "/placeholder.svg"
      }
      alt={alt}
      width={16}
      height={16}
      loading="lazy"
      onLoad={() => setLoading(false)}
      className={cn(
        loading ? "blur-[2px]" : "blur-0",
        "transition-all duration-300 ease-in-out",
      )}
      onError={() => setError(true)}
    />
  );
};

const FilterOptionItem = ({
  category,
  option,
  isSelected,
  onSelect,
  getOptionLabel,
  getOptionIcon,
}: {
  category: FilterCategory;
  option: FilterOption;
  isSelected: boolean;
  onSelect: (event: Event) => void;
  getOptionValue: (category: FilterCategory, option: FilterOption) => string;
  getOptionLabel: (category: FilterCategory, option: FilterOption) => string;
  getOptionIcon: (
    category: FilterCategory,
    option: FilterOption,
  ) => string | undefined;
}) => {
  const label = getOptionLabel(category, option);
  const icon = getOptionIcon(category, option);

  return (
    <DropdownMenuCheckboxItem
      checked={isSelected}
      onSelect={onSelect}
      className="rounded-md px-3 py-1.5 pl-8 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <div className="flex cursor-pointer items-center gap-2">
        {category.id === "slug_key" && (
          <span className="line-clamp-1 flex items-center gap-x-2">
            <UrlAvatar size={5} url={(option as LinkAnalytics).url} />
            {label}
          </span>
        )}
        {category.id === "country_key" && (
          <CountryFlag code={(option as CountryAnalytics).country} />
        )}
        {category.id === "city_key" && (
          <>
            <CountryFlag
              allowCountry={false}
              code={(option as CityAnalytics).country}
            />
            <span className="line-clamp-1 capitalize">
              {(option as CityAnalytics).city}
            </span>
          </>
        )}
        {category.id === "continent_key" && (
          <>
            <NotoGlobeShowingAmericas />
            <ContinentFlag code={(option as ContinentAnalytics).continent} />
          </>
        )}
        {(category.id === "browser_key" ||
          category.id === "os_key" ||
          category.id === "device_key") && (
          <>
            <OptimizedImage src={icon ?? ""} alt={label} />
            <span className="line-clamp-1 capitalize">{label}</span>
          </>
        )}
        {category.id === "referrer_key" && (
          <>
            <UrlAvatar size={5} url={(option as ReferrerAnalytics).referrer} />
            <span className="line-clamp-1">{label}</span>
          </>
        )}
        {category.id === "trigger_key" && (
          <span className="line-clamp-1 capitalize">{label}</span>
        )}
        {category.id === "destination_key" && (
          <>
            <UrlAvatar
              size={5}
              url={(option as DestinationAnalytics).destination}
            />
            <span className="line-clamp-1">{label}</span>
          </>
        )}
      </div>
    </DropdownMenuCheckboxItem>
  );
};

interface TimePeriodSelectorProps {
  timePeriod: string;
  onTimePeriodChange: (value: string) => void;
  isPro: boolean;
  /**
   * Restrict visible ranges (e.g. shared reports cap at 30d). Defaults to
   * all six ranges; the Pro locks still apply within the allowed set.
   */
  allowedPeriods?: readonly string[];
}

const ALL_PERIODS = ["24h", "7d", "30d", "3m", "12m", "all"] as const;

export const TimePeriodSelector = ({
  timePeriod,
  onTimePeriodChange,
  isPro,
  allowedPeriods = ALL_PERIODS,
}: TimePeriodSelectorProps) => {
  const allowed = new Set(allowedPeriods);
  const show = (value: string) => allowed.has(value);
  return (
    <Select value={timePeriod} onValueChange={onTimePeriodChange}>
      <SelectTrigger className="h-9 w-fit rounded-lg border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50">
        <Calendar className="h-4 w-4 text-zinc-500" />{" "}
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent className="animate-in fade-in slide-in-from-top-2 w-fit cursor-pointer duration-150 ease-out">
        {show("24h") && (
          <div
            className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out"
            style={{ animationDelay: "0ms", animationFillMode: "both" }}
          >
            <SelectItem
              className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              value="24h"
            >
              Last 24 hours
            </SelectItem>
          </div>
        )}
        {show("7d") && (
          <div
            className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out"
            style={{ animationDelay: "30ms", animationFillMode: "both" }}
          >
            <SelectItem
              className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              value="7d"
            >
              Last 7 days
            </SelectItem>
          </div>
        )}
        {show("30d") && (
          <div
            className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out"
            style={{ animationDelay: "60ms", animationFillMode: "both" }}
          >
            <SelectItem
              className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              value="30d"
            >
              Last 30 days
            </SelectItem>
          </div>
        )}
        {show("3m") && (
          <div
            className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out"
            style={{ animationDelay: "90ms", animationFillMode: "both" }}
          >
            {isPro ? (
              <SelectItem
                className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                value="3m"
              >
                Last 3 months
              </SelectItem>
            ) : (
              <SelectItem
                className="opacity-60 transition-colors duration-150 ease-in-out"
                value="3m"
                disabled
              >
                Last 3 months
                <Lock
                  size={10}
                  className="text-muted-foreground absolute right-2 h-2.5 w-2"
                />
              </SelectItem>
            )}
          </div>
        )}
        {show("12m") && (
          <div
            className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            {isPro ? (
              <SelectItem
                className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                value="12m"
              >
                Last 12 months
              </SelectItem>
            ) : (
              <SelectItem
                className="opacity-60 transition-colors duration-150 ease-in-out"
                value="12m"
                disabled
              >
                Last 12 months
                <Lock
                  size={10}
                  className="text-muted-foreground absolute right-2 h-2.5 w-2"
                />
              </SelectItem>
            )}
          </div>
        )}
        {show("all") && (
          <div
            className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out"
            style={{ animationDelay: "150ms", animationFillMode: "both" }}
          >
            <SelectItem
              className="opacity-60 transition-colors duration-150 ease-in-out"
              value="all"
              disabled
            >
              All Time
              <Lock
                size={10}
                className="text-muted-foreground absolute right-2 h-2.5 w-2"
              />
            </SelectItem>
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

interface FilterGroupsProps {
  filteredCategories: FilterCategory[];
  onCategoryClick: (categoryId: CategoryId) => void;
}

const FilterGroups = ({
  filteredCategories,
  onCategoryClick,
}: FilterGroupsProps) => {
  const hasGroup1 = filteredCategories.some(
    (cat) => cat.id === "slug_key" || cat.id === "destination_key",
  );
  const hasGroup2 = filteredCategories.some(
    (cat) =>
      cat.id === "country_key" ||
      cat.id === "city_key" ||
      cat.id === "continent_key",
  );
  const hasGroup3 = filteredCategories.some(
    (cat) =>
      cat.id === "device_key" ||
      cat.id === "browser_key" ||
      cat.id === "os_key",
  );
  const hasGroup4 = filteredCategories.some(
    (cat) => cat.id === "referrer_key" || cat.id === "trigger_key",
  );

  return (
    <div
      className="custom-scrollbar animate-in slide-in-from-top-2 overflow-x-hidden overflow-y-auto duration-200"
      style={{
        maxHeight: "400px",
        scrollbarWidth: "thin",
        scrollbarColor: "rgb(203 213 225) transparent",
      }}
    >
      {/* Group 1 */}
      {hasGroup1 && (
        <DropdownMenuGroup>
          {filteredCategories
            .filter(
              (cat) => cat.id === "slug_key" || cat.id === "destination_key",
            )
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-lg p-2 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => onCategoryClick(category.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCategoryClick(category.id);
                    }
                  }}
                >
                  {category.icon}
                  <span className="ml-2 text-sm font-normal">
                    {category.label}
                  </span>
                  <span className="ml-auto flex items-center">
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </span>
                </DropdownMenuLabel>
              </div>
            ))}
        </DropdownMenuGroup>
      )}

      {/* Separator */}
      {hasGroup1 && hasGroup2 && <Separator className="my-1 bg-zinc-200/70" />}

      {/* Group 2 */}
      {hasGroup2 && (
        <DropdownMenuGroup>
          {filteredCategories
            .filter(
              (cat) =>
                cat.id === "country_key" ||
                cat.id === "city_key" ||
                cat.id === "continent_key",
            )
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${(index + 2) * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-lg p-2 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => onCategoryClick(category.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCategoryClick(category.id);
                    }
                  }}
                >
                  {category.icon}
                  <span className="ml-2 text-sm font-normal">
                    {category.label}
                  </span>
                  <span className="ml-auto flex items-center">
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </span>
                </DropdownMenuLabel>
              </div>
            ))}
        </DropdownMenuGroup>
      )}

      {/* Separator */}
      {hasGroup2 && hasGroup3 && <Separator className="my-1 bg-zinc-200/70" />}

      {/* Group 3 */}
      {hasGroup3 && (
        <DropdownMenuGroup>
          {filteredCategories
            .filter(
              (cat) =>
                cat.id === "device_key" ||
                cat.id === "browser_key" ||
                cat.id === "os_key",
            )
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${(index + 5) * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-lg p-2 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => onCategoryClick(category.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCategoryClick(category.id);
                    }
                  }}
                >
                  {category.icon}
                  <span className="ml-2 text-sm font-normal">
                    {category.label}
                  </span>
                  <span className="ml-auto flex items-center">
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </span>
                </DropdownMenuLabel>
              </div>
            ))}
        </DropdownMenuGroup>
      )}

      {/* Separator */}
      {hasGroup3 && hasGroup4 && <Separator className="my-1 bg-zinc-200/70" />}

      {/* Group 4 */}
      {hasGroup4 && (
        <DropdownMenuGroup>
          {filteredCategories
            .filter(
              (cat) => cat.id === "referrer_key" || cat.id === "trigger_key",
            )
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${(index + 8) * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-lg p-2 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => onCategoryClick(category.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCategoryClick(category.id);
                    }
                  }}
                >
                  {category.icon}
                  <span className="ml-2 text-sm font-normal">
                    {category.label}
                  </span>
                  <span className="ml-auto flex items-center">
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </span>
                </DropdownMenuLabel>
              </div>
            ))}
        </DropdownMenuGroup>
      )}
    </div>
  );
};

const ASK_AI_SUGGESTIONS = [
  { icon: Smartphone, label: "Mobile users, US only" },
  { icon: Chrome, label: "Tokyo, Chrome users" },
  { icon: Flag, label: "Safari, Singapore, last month" },
  { icon: QrCode, label: "QR scans last quarter" },
] as const;

const FilterActions = ({ filterCategories }: FilterActionsProps) => {
  const { isPro, fetchSubscription } = useSubscriptionStore();
  const params = useParams();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = () => {
    const workspaceslug =
      params?.workspace ?? params?.workspaceslug ?? params?.slug;
    const slug = Array.isArray(workspaceslug)
      ? workspaceslug[0]
      : workspaceslug;
    if (!slug) {
      toast.error("Failed to export analytics");
      return;
    }
    setIsExporting(true);
    const query = searchParams.toString();
    // Preserve current time_period / filters / event
    const url = `/api/workspace/${slug}/analytics/export${query ? `?${query}` : ""}`;

    const promise = (async () => {
      const res = await fetch(url);
      if (!res.ok) {
        let message = "Failed to export analytics";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          // non-JSON error — keep default message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("No analytics data to export");
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = objectUrl;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/);
      a.download = match?.[1] ?? `slugy-analytics-${slug}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
      return "Analytics exported successfully.";
    })();

    toast.promise(promise, {
      loading: "Exporting analytics... This may take up to a minute.",
      success: (msg: string) => msg,
      error: (err: Error) => err.message || "Failed to export analytics",
    });

    promise.finally(() => setIsExporting(false));
  };

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const [timePeriod, setTimePeriod] = useQueryState(
    "time_period",
    parseAsString.withDefault("24h"),
  );
  const [slugFilter, setSlugFilter] = useQueryState(
    "slug_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [continentFilter, setContinentFilter] = useQueryState(
    "continent_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [countryFilter, setCountryFilter] = useQueryState(
    "country_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [cityFilter, setCityFilter] = useQueryState(
    "city_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [browserFilter, setBrowserFilter] = useQueryState(
    "browser_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [osFilter, setOsFilter] = useQueryState(
    "os_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [deviceFilter, setDeviceFilter] = useQueryState(
    "device_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [referrerFilter, setReferrerFilter] = useQueryState(
    "referrer_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [triggerFilter, setTriggerFilter] = useQueryState(
    "trigger_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );
  const [destinationFilter, setDestinationFilter] = useQueryState(
    "destination_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );

  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterView, setFilterView] = useState<"list" | "ask">("list");
  const [askQuery, setAskQuery] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [askQuota, setAskQuota] = useState<{
    limit: number;
    remaining: number;
    isLimited: boolean;
  } | null>(null);

  const selectedFilters = {
    slug_key: slugFilter,
    continent_key: continentFilter,
    country_key: countryFilter,
    city_key: cityFilter,
    browser_key: browserFilter,
    os_key: osFilter,
    device_key: deviceFilter,
    referrer_key: referrerFilter,
    trigger_key: triggerFilter,
    destination_key: destinationFilter,
  };

  const handleTimePeriodChange = (newTimePeriod: string) => {
    const longRangeValues = ["3m", "12m", "all"];
    if (!isPro && longRangeValues.includes(newTimePeriod)) return;
    void setTimePeriod(newTimePeriod);
  };

  /** Apply Ask-AI result: replace filters per key, optionally switch period. */
  const handleAskAiApply = (result: AskAiResult) => {
    const setters: Record<CategoryId, (v: string[] | null) => void> = {
      slug_key: (v) => void setSlugFilter(v),
      continent_key: (v) => void setContinentFilter(v),
      country_key: (v) => void setCountryFilter(v),
      city_key: (v) => void setCityFilter(v),
      browser_key: (v) => void setBrowserFilter(v),
      os_key: (v) => void setOsFilter(v),
      device_key: (v) => void setDeviceFilter(v),
      referrer_key: (v) => void setReferrerFilter(v),
      trigger_key: (v) => void setTriggerFilter(v),
      destination_key: (v) => void setDestinationFilter(v),
    };
    for (const [key, values] of Object.entries(result.filters)) {
      const setter = setters[key as CategoryId];
      if (setter && Array.isArray(values) && values.length > 0) {
        setter(values);
      }
    }
    if (result.time_period) handleTimePeriodChange(result.time_period);
  };

  const handleFilterOpenChange = (open: boolean) => {
    setFilterOpen(open);
    if (!open) {
      // Reset menu state so it always opens on the category list.
      setFilterView("list");
      setActiveCategory(null);
      setSearchQuery("");
      setAskQuery("");
      setAskError(null);
    }
  };

  const fetchAskQuota = async (workspaceSlug: string) => {
    try {
      const res = await fetch(`/api/workspace/${workspaceSlug}/analytics/ask`);
      if (!res.ok) return;
      const body = (await res.json()) as {
        success: boolean;
        data?: {
          quota?: { limit: number; remaining: number; isLimited: boolean };
        };
      };
      if (body.success && body.data?.quota) setAskQuota(body.data.quota);
    } catch {
      // quota badge is best-effort
    }
  };

  const openAskView = () => {
    setAskError(null);
    setFilterView("ask");
    if (askAiWorkspaceSlug) void fetchAskQuota(askAiWorkspaceSlug);
  };

  const submitAskQuery = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || askLoading || !askAiWorkspaceSlug) return;
    if (askQuota?.isLimited && askQuota.remaining <= 0) {
      setAskError(
        "Daily free limit reached. Upgrade to Pro for unlimited AI queries.",
      );
      return;
    }
    setAskLoading(true);
    setAskError(null);
    try {
      const res = await fetch(
        `/api/workspace/${askAiWorkspaceSlug}/analytics/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            timePeriod,
            currentFilters: askAiCurrentFilters,
            availableOptions: askAiAvailableOptions,
          }),
        },
      );
      const body = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: AskAiResult & {
          quota?: { limit: number; remaining: number; isLimited: boolean };
        };
      };
      if (!res.ok || !body.success || !body.data) {
        if (res.status === 429) {
          setAskError(
            "Daily free limit reached (10/day). Upgrade to Pro for unlimited AI queries.",
          );
        } else {
          setAskError(body.error || "AI request failed. Try again.");
        }
        return;
      }
      if (body.data.quota) setAskQuota(body.data.quota);
      handleAskAiApply(body.data);
      toast.success(body.data.explanation);
      setFilterOpen(false);
      setFilterView("list");
      setAskQuery("");
    } catch {
      setAskError("AI request failed. Try again.");
    } finally {
      setAskLoading(false);
    }
  };

  const askAiWorkspaceSlug = (() => {
    const ws = params?.workspace ?? params?.workspaceslug ?? params?.slug;
    return Array.isArray(ws) ? (ws[0] ?? "") : (ws ?? "");
  })();

  const askAiAvailableOptions = (() => {
    const out: Record<string, string[]> = {};
    for (const category of filterCategories) {
      const values = category.options
        .map((option) => {
          switch (category.id) {
            case "slug_key":
              return (option as LinkAnalytics).slug;
            case "continent_key":
              return (option as ContinentAnalytics).continent;
            case "country_key":
              return (option as CountryAnalytics).country;
            case "city_key":
              return (option as CityAnalytics).city;
            case "browser_key":
              return (option as BrowserAnalytics).browser;
            case "os_key":
              return (option as OsAnalytics).os;
            case "device_key":
              return (option as DeviceAnalytics).device;
            case "referrer_key":
              return (option as ReferrerAnalytics).referrer;
            case "trigger_key":
              return (option as TriggerAnalytics).trigger;
            case "destination_key":
              return (option as DestinationAnalytics).destination;
            default:
              return "";
          }
        })
        .filter(Boolean)
        .slice(0, 20);
      if (values.length > 0) out[category.id] = values;
    }
    return out;
  })();

  const askAiCurrentFilters = Object.fromEntries(
    Object.entries(selectedFilters)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => [k, v.join(",")]),
  );

  const handleFilterChange = (categoryId: CategoryId, value: string) => {
    const current: string[] = selectedFilters[categoryId] ?? [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    // Update or clear filters
    switch (categoryId) {
      case "slug_key":
        void setSlugFilter(updated.length ? updated : null);
        break;
      case "continent_key":
        void setContinentFilter(updated.length ? updated : null);
        break;
      case "country_key":
        void setCountryFilter(updated.length ? updated : null);
        break;
      case "city_key":
        void setCityFilter(updated.length ? updated : null);
        break;
      case "browser_key":
        void setBrowserFilter(updated.length ? updated : null);
        break;
      case "os_key":
        void setOsFilter(updated.length ? updated : null);
        break;
      case "device_key":
        void setDeviceFilter(updated.length ? updated : null);
        break;
      case "referrer_key":
        void setReferrerFilter(updated.length ? updated : null);
        break;
      case "trigger_key":
        void setTriggerFilter(updated.length ? updated : null);
        break;
      case "destination_key":
        void setDestinationFilter(updated.length ? updated : null);
        break;
    }
  };

  const removeFilter = (categoryId: CategoryId, value: string) => {
    handleFilterChange(categoryId, value);
  };

  const getOptionValue = (
    category: FilterCategory,
    option: FilterOption,
  ): string => {
    switch (category.id) {
      case "slug_key":
        return (option as LinkAnalytics).slug;
      case "continent_key":
        return (option as ContinentAnalytics).continent;
      case "country_key":
        return (option as CountryAnalytics).country;
      case "city_key":
        return (option as CityAnalytics).city;
      case "browser_key":
        return (option as BrowserAnalytics).browser;
      case "os_key":
        return (option as OsAnalytics).os;
      case "device_key":
        return (option as DeviceAnalytics).device;
      case "referrer_key":
        return (option as ReferrerAnalytics).referrer;
      case "trigger_key":
        return (option as TriggerAnalytics).trigger;
      case "destination_key":
        return (option as DestinationAnalytics).destination;
      default:
        return "";
    }
  };

  const getOptionLabel = (
    category: FilterCategory,
    option: FilterOption,
  ): string => {
    switch (category.id) {
      case "slug_key":
        return `slugy.co/${(option as LinkAnalytics).slug}`;
      case "continent_key":
        return (option as ContinentAnalytics).continent;
      case "country_key":
        return (option as CountryAnalytics).country;
      case "city_key":
        return (option as CityAnalytics).city;
      case "browser_key":
        return (option as BrowserAnalytics).browser;
      case "os_key":
        return (option as OsAnalytics).os;
      case "device_key":
        return (option as DeviceAnalytics).device;
      case "referrer_key":
        return (option as ReferrerAnalytics).referrer;
      case "trigger_key":
        return triggerLabel((option as TriggerAnalytics).trigger);
      case "destination_key":
        return (option as DestinationAnalytics).destination;
      default:
        return "";
    }
  };

  const formatNameForUrl = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, "-");
  };

  const getOptionIcon = (
    category: FilterCategory,
    option: FilterOption,
  ): string | undefined => {
    switch (category.id) {
      case "slug_key":
        return (option as LinkAnalytics).url;
      case "country_key":
      case "city_key":
        return `https://flagcdn.com/w20/${(option as CountryAnalytics).country.toLowerCase()}.png`;
      case "continent_key":
        return `https://slugylink.github.io/slugy-assets/dist/colorful/continent/${formatNameForUrl(
          (option as ContinentAnalytics).continent,
        )}.svg`;
      case "browser_key":
        return `https://slugylink.github.io/slugy-assets/dist/colorful/browser/${formatNameForUrl(
          (option as BrowserAnalytics).browser,
        )}.svg`;
      case "os_key":
        return `https://slugylink.github.io/slugy-assets/dist/colorful/os/${formatNameForUrl(
          (option as OsAnalytics).os,
        )}.svg`;
      case "device_key":
        return `https://slugylink.github.io/slugy-assets/dist/colorful/device/${formatNameForUrl(
          (option as DeviceAnalytics).device,
        )}.svg`;
      default:
        return undefined;
    }
  };

  const searchFilteredOptions = (() => {
    if (!searchQuery) return new Map();

    const q = searchQuery.toLowerCase();
    const results = new Map<CategoryId, Set<string>>();

    filterCategories.forEach((category) => {
      const matchingValues = new Set<string>();

      if (category.label.toLowerCase().includes(q)) {
        // If category label matches, include all options
        category.options.forEach((option) => {
          const value = getOptionValue(category, option);
          matchingValues.add(value);
        });
      } else {
        // Check individual options
        category.options.forEach((option) => {
          if (getOptionLabel(category, option).toLowerCase().includes(q)) {
            const value = getOptionValue(category, option);
            matchingValues.add(value);
          }
        });
      }

      if (matchingValues.size > 0) {
        results.set(category.id, matchingValues);
      }
    });

    return results;
  })();

  const filteredCategories = filterCategories.filter((category) => {
    if (activeCategory && category.id !== activeCategory) return false;

    if (searchQuery) {
      return searchFilteredOptions.has(category.id);
    }

    return true;
  });

  const selectedFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="mt-8 flex w-full flex-col gap-2">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <DropdownMenu open={filterOpen} onOpenChange={handleFilterOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex h-9 items-center gap-2 rounded-lg border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
              >
                <ListFilter className="h-4 w-4 text-zinc-500" />
                Filter
                {selectedFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {selectedFilterCount}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="animate-in fade-in slide-in-from-top-2 relative min-w-64 overflow-x-hidden rounded-xl border-zinc-200 p-2 duration-200 ease-out"
              align="start"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {filterView === "ask" ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-1 border-b border-zinc-200/70 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterView("list");
                        setAskError(null);
                      }}
                      className="rounded-md p-1 transition-colors hover:bg-zinc-100"
                      aria-label="Back to filters"
                    >
                      <ChevronLeft className="h-4 w-4 text-zinc-500" />
                    </button>
                    <span className="text-sm text-zinc-500">Ask AI...</span>
                    {askQuota && (
                      <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                        {askQuota.isLimited
                          ? `${askQuota.remaining}/${askQuota.limit} left`
                          : "Unlimited"}
                      </span>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitAskQuery(askQuery);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={askQuery}
                      onChange={(e) => setAskQuery(e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Ask AI..."
                      autoFocus
                      autoComplete="off"
                      aria-label="Ask AI"
                      className="h-10 w-full border-b border-zinc-200/70 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400"
                    />
                  </form>

                  {askLoading && (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                  )}

                  {askError && (
                    <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-600">
                      {(askError.includes("Upgrade") ||
                        askError.includes("limit")) && (
                        <Lock className="h-3 w-3 shrink-0" />
                      )}
                      {askError}
                    </p>
                  )}

                  <div className="pt-1">
                    {ASK_AI_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion.label}
                        type="button"
                        disabled={askLoading}
                        onClick={() => {
                          setAskQuery(suggestion.label);
                          void submitAskQuery(suggestion.label);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                      >
                        <suggestion.icon className="h-4 w-4 shrink-0 text-zinc-400" />
                        <span className="line-clamp-1">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="relative flex-1"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={searchQuery}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSearchQuery(e.target.value);
                        }}
                        className="h-9 w-full rounded-lg border-zinc-200 bg-zinc-50 pr-8 pl-9 text-sm focus:bg-white focus:ring-[1px] focus:outline-none"
                        autoComplete="off"
                        aria-label="Filter options"
                      />
                      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 text-[10px] text-zinc-400">
                        F
                      </kbd>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openAskView}
                    className="mb-1 flex w-full items-center gap-2.5 rounded-lg bg-zinc-100 px-3 py-2 text-left text-sm font-normal transition-colors hover:bg-zinc-200/70"
                  >
                    <HiSparkles className="h-4 w-4 text-zinc-500" />
                    Ask AI
                  </button>

                  {activeCategory ? (
                    <div className="animate-in slide-in-from-top-2 relative overflow-x-hidden duration-200">
                      {filteredCategories
                        .filter((cat) => cat.id === activeCategory)
                        .map((category) => (
                          <DropdownMenuGroup key={category.id}>
                            <div className="sticky top-0 z-50 mb-2">
                              <DropdownMenuLabel
                                className="flex cursor-pointer items-center justify-between rounded-lg bg-zinc-50 p-2 font-medium transition-colors hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                                onClick={() => setActiveCategory(null)}
                              >
                                <div className="flex items-center">
                                  {category.icon}
                                  <span className="ml-2 text-sm font-medium">
                                    {category.label}
                                  </span>
                                </div>
                                <ChevronsUp className="text-muted-foreground ml-auto h-4 w-4" />
                              </DropdownMenuLabel>
                            </div>
                            <div
                              className="custom-scrollbar animate-in slide-in-from-top-2 overflow-x-hidden overflow-y-auto duration-200"
                              style={{
                                maxHeight: "320px",
                                scrollbarWidth: "thin",
                                scrollbarColor: "rgb(203 213 225) transparent",
                              }}
                            >
                              <div className="space-y-1">
                                {category.options
                                  .filter((option) =>
                                    searchQuery
                                      ? getOptionLabel(category, option)
                                          .toLowerCase()
                                          .includes(searchQuery.toLowerCase())
                                      : true,
                                  )
                                  .map((option, index) => {
                                    const val = getOptionValue(
                                      category,
                                      option,
                                    );
                                    return (
                                      <div
                                        key={val}
                                        className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                                        style={{
                                          animationDelay: `${index * 30}ms`,
                                          animationFillMode: "both",
                                        }}
                                      >
                                        <FilterOptionItem
                                          category={category}
                                          option={option}
                                          isSelected={selectedFilters[
                                            category.id
                                          ]?.includes(val)}
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            handleFilterChange(
                                              category.id,
                                              val,
                                            );
                                          }}
                                          getOptionValue={getOptionValue}
                                          getOptionLabel={getOptionLabel}
                                          getOptionIcon={getOptionIcon}
                                        />
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </DropdownMenuGroup>
                        ))}
                    </div>
                  ) : (
                    <FilterGroups
                      filteredCategories={filteredCategories}
                      onCategoryClick={setActiveCategory}
                    />
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <TimePeriodSelector
            timePeriod={timePeriod}
            onTimePeriodChange={handleTimePeriodChange}
            isPro={isPro}
          />

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-lg border-zinc-200 bg-white hover:bg-zinc-50"
                  aria-label="export as csv"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <EllipsisVertical />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleExportCsv}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {selectedFilterCount > 0 && (
        <FilterSelectedButtons
          filterCategories={filterCategories}
          selectedFilters={selectedFilters}
          onRemoveFilter={removeFilter}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(203 213 225);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
};

export default FilterActions;
