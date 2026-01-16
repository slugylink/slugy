"use client";

import { useState, type ReactNode } from "react";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown, ChevronsUp, Filter, Lock } from "lucide-react";
import Image from "next/image";
import ContinentFlag from "./continent-flag";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
import UrlAvatar from "@/components/web/url-avatar";
import CountryFlag from "./country-flag";
import FilterSelectedButtons from "./filter-selected-buttons";
import { useQueryState, parseAsString, parseAsArrayOf } from "nuqs";

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
  | "referrer_key";

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
      className={cn(loading ? "blur-[2px]" : "blur-0", "transition-all duration-300 ease-in-out")}
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
      className="px-3 py-1.5 pl-8 transition-all duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
            <UrlAvatar
              size={5}
              url={(option as ReferrerAnalytics).referrer}
            />
            <span className="line-clamp-1">{label}</span>
          </>
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
}

const TimePeriodSelector = ({
  timePeriod,
  onTimePeriodChange
}: TimePeriodSelectorProps) => (
  <Select value={timePeriod} onValueChange={onTimePeriodChange}>
    <SelectTrigger className="w-fit text-sm shadow-none transition-all duration-200 ease-in-out hover:shadow-sm hover:border-zinc-300">
      <Calendar /> <SelectValue placeholder="Select time range" />
    </SelectTrigger>
    <SelectContent className="w-fit cursor-pointer animate-in fade-in slide-in-from-top-2 duration-150 ease-out">
      <div className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <SelectItem className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50" value="24h">
          Last 24 hours
        </SelectItem>
      </div>
      <div className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out" style={{ animationDelay: '30ms', animationFillMode: 'both' }}>
        <SelectItem className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50" value="7d">
          Last 7 days
        </SelectItem>
      </div>
      <div className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
        <SelectItem className="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-zinc-50 dark:hover:bg-zinc-800/50" value="30d">
          Last 30 days
        </SelectItem>
      </div>
      <div className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out" style={{ animationDelay: '90ms', animationFillMode: 'both' }}>
        <SelectItem className="transition-colors duration-150 ease-in-out opacity-60" value="3m" disabled>
          Last 3 months
          <Lock
            size={10}
            className="text-muted-foreground absolute right-2 h-2.5 w-2"
          />
        </SelectItem>
      </div>
      <div className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
        <SelectItem className="transition-colors duration-150 ease-in-out opacity-60" value="12m" disabled>
          Last 12 months
          <Lock
            size={10}
            className="text-muted-foreground absolute right-2 h-2.5 w-2"
          />
        </SelectItem>
      </div>
      <div className="animate-in fade-in slide-in-from-left-1 duration-150 ease-out" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
        <SelectItem className="transition-colors duration-150 ease-in-out opacity-60" value="all" disabled>
          All Time
          <Lock
            size={10}
            className="text-muted-foreground absolute right-2 h-2.5 w-2"
          />
        </SelectItem>
      </div>
    </SelectContent>
  </Select>
);

interface FilterGroupsProps {
  filteredCategories: FilterCategory[];
  onCategoryClick: (categoryId: CategoryId) => void;
}

const FilterGroups = ({ filteredCategories, onCategoryClick }: FilterGroupsProps) => {
  const hasGroup1 = filteredCategories.some(cat => cat.id === "slug_key" || cat.id === "destination_key");
  const hasGroup2 = filteredCategories.some(cat =>
    cat.id === "country_key" || cat.id === "city_key" || cat.id === "continent_key"
  );
  const hasGroup3 = filteredCategories.some(cat =>
    cat.id === "device_key" || cat.id === "browser_key" || cat.id === "os_key"
  );
  const hasGroup4 = filteredCategories.some(cat => cat.id === "referrer_key");

  return (
    <div
      className="custom-scrollbar animate-in slide-in-from-top-2 overflow-y-auto duration-200 overflow-x-hidden"
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
            .filter(cat => cat.id === "slug_key" || cat.id === "destination_key")
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-all duration-200 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:translate-x-0.5"
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
                  <span className="ml-2 font-normal">{category.label}</span>
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
            .filter(cat =>
              cat.id === "country_key" || cat.id === "city_key" || cat.id === "continent_key"
            )
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${(index + 2) * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-all duration-200 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:translate-x-0.5"
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
                  <span className="ml-2 font-normal">{category.label}</span>
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
            .filter(cat =>
              cat.id === "device_key" || cat.id === "browser_key" || cat.id === "os_key"
            )
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${(index + 5) * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-all duration-200 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:translate-x-0.5"
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
                  <span className="ml-2 font-normal">{category.label}</span>
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
            .filter(cat => cat.id === "referrer_key")
            .map((category, index) => (
              <div
                key={category.id}
                className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                style={{
                  animationDelay: `${(index + 8) * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                <DropdownMenuLabel
                  className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-all duration-200 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:translate-x-0.5"
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
                  <span className="ml-2 font-normal">{category.label}</span>
                </DropdownMenuLabel>
              </div>
            ))}
        </DropdownMenuGroup>
      )}
    </div>
  );
};

const FilterActions = ({ filterCategories }: FilterActionsProps) => {
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
  const [destinationFilter, setDestinationFilter] = useQueryState(
    "destination_key",
    parseAsArrayOf(parseAsString, ",").withDefault([]),
  );

  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedFilters = {
    slug_key: slugFilter,
    continent_key: continentFilter,
    country_key: countryFilter,
    city_key: cityFilter,
    browser_key: browserFilter,
    os_key: osFilter,
    device_key: deviceFilter,
    referrer_key: referrerFilter,
    destination_key: destinationFilter,
  };

  const handleTimePeriodChange = (newTimePeriod: string) => {
    void setTimePeriod(newTimePeriod);
  };

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
      case "destination_key":
        void setDestinationFilter(updated.length ? updated : null);
        break;
    }
  };

  const removeFilter = (categoryId: CategoryId, value: string) => {
    handleFilterChange(categoryId, value);
  };

  const getOptionValue = (category: FilterCategory, option: FilterOption): string => {
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
      case "destination_key":
        return (option as DestinationAnalytics).destination;
      default:
        return "";
    }
  };

  const getOptionLabel = (category: FilterCategory, option: FilterOption): string => {
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
      case "destination_key":
        return (option as DestinationAnalytics).destination;
      default:
        return "";
    }
  };

  const formatNameForUrl = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, "-");
  };

  const getOptionIcon = (category: FilterCategory, option: FilterOption): string | undefined => {
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
    <div className="flex w-full flex-col items-start justify-between space-y-2">
      <div className="flex w-full items-center justify-between space-x-2">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center font-normal transition-all duration-200 ease-in-out hover:shadow-sm hover:border-zinc-300"
              >
                <Filter strokeWidth={1.5} className=" h-4 w-4" />
                Filter
                {selectedFilterCount > 0 && (
                  <span className="bg-primary text-primary-foreground flex h-[18px] w-[18px] text-center items-center justify-center rounded-full text-[11px]">
                    {selectedFilterCount}
                  </span>
                )}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="relative w-[212px] p-2 animate-in fade-in slide-in-from-top-2 duration-200 ease-out overflow-x-hidden"
              align="start"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div
                className="mb-2 font-normal"
                onMouseDown={(e) => e.stopPropagation()}
              >
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
                  className="focus:ring-primary w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:ring-[1px] focus:outline-none transition-all duration-200 ease-in-out focus:border-zinc-300 focus:shadow-sm"
                  autoComplete="off"
                  aria-label="Filter options"
                />
              </div>

              {activeCategory ? (
                <div className="animate-in slide-in-from-top-2 relative duration-200 overflow-x-hidden">
                  {filteredCategories
                    .filter((cat) => cat.id === activeCategory)
                    .map((category) => (
                      <DropdownMenuGroup key={category.id}>
                        <div className="sticky top-0 z-50 mb-2 ">
                          <DropdownMenuLabel
                            className="bg-primary-foreground flex cursor-pointer items-center justify-between rounded-md p-2 font-medium transition-all duration-200 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => setActiveCategory(null)}
                          >
                            <div className="flex items-center">
                              {category.icon}
                              <span className="ml-2 font-normal">
                                {category.label}
                              </span>
                            </div>
                            <ChevronsUp className="text-muted-foreground ml-auto h-4 w-4" />
                          </DropdownMenuLabel>
                        </div>
                        <div
                          className="custom-scrollbar animate-in slide-in-from-top-2 overflow-y-auto duration-200 overflow-x-hidden"
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
                                const val = getOptionValue(category, option);
                                return (
                                  <div
                                    key={val}
                                    className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out"
                                    style={{
                                      animationDelay: `${index * 30}ms`,
                                      animationFillMode: 'both'
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
                                        handleFilterChange(category.id, val);
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TimePeriodSelector
          timePeriod={timePeriod}
          onTimePeriodChange={handleTimePeriodChange}
        />
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
