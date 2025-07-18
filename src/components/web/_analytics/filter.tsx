"use client";
import React, { memo } from "react";
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
import { ChevronDown, ChevronsUpDown, Filter } from "lucide-react";
import Image from "next/image";
import ContinentFlag from "./continent-flag";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
import UrlAvatar from "@/components/web/url-avatar";
import CountryFlag from "./country-flag";
import FilterSelectedButtons from "./filter-selected-buttons";
import { useQueryState, parseAsString, parseAsArrayOf } from "nuqs";

// Base interface for all options
interface BaseOption {
  clicks?: number;
}

// Specific option interfaces with strict typing
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

// Union type for all possible option types
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

// Literal type for category IDs
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

// Interface for filter categories
export interface FilterCategory {
  id: CategoryId;
  label: string;
  icon: React.ReactNode;
  options: FilterOption[];
}

interface FilterActionsProps {
  fillterCategory: FilterCategory[];
}

const OptimizedImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

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
      className={cn(loading ? "blur-[2px]" : "blur-0", "transition-all")}
      onError={() => setError(true)}
    />
  );
});
OptimizedImage.displayName = "OptimizedImage";

const FilterOptionItem = memo(
  ({
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
    onSelect: (e: Event) => void;
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
        className="px-3 py-1.5 pl-8"
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
          {(category.id === "browser_key" || category.id === "os_key") && (
            <>
              <OptimizedImage src={icon ?? ""} alt={label} />
              <span className="line-clamp-1 capitalize">{label}</span>
            </>
          )}
          {category.id === "device_key" && (
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
  },
);
FilterOptionItem.displayName = "FilterOptionItem";

const FilterActions = ({ fillterCategory }: FilterActionsProps) => {
  // Use nuqs for each filter category and time_period
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

  const [activeCategory, setActiveCategory] = React.useState<CategoryId | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  // Compose selectedFilters from nuqs state
  const selectedFilters = React.useMemo(
    () => ({
      slug_key: slugFilter,
      continent_key: continentFilter,
      country_key: countryFilter,
      city_key: cityFilter,
      browser_key: browserFilter,
      os_key: osFilter,
      device_key: deviceFilter,
      referrer_key: referrerFilter,
      destination_key: destinationFilter,
    }),
    [
      slugFilter,
      continentFilter,
      countryFilter,
      cityFilter,
      browserFilter,
      osFilter,
      deviceFilter,
      referrerFilter,
      destinationFilter,
    ],
  );

  const handleTimePeriodChange = React.useCallback(
    (newTimePeriod: string) => {
      void setTimePeriod(newTimePeriod);
    },
    [setTimePeriod],
  );

  const handleFilterChange = React.useCallback(
    (categoryId: CategoryId, value: string) => {
      const current: string[] = selectedFilters[categoryId] ?? [];
      let updated: string[];
      if (current.includes(value)) {
        updated = current.filter((v) => v !== value);
      } else {
        updated = [...current, value];
      }
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
    },
    [
      selectedFilters,
      setSlugFilter,
      setContinentFilter,
      setCountryFilter,
      setCityFilter,
      setBrowserFilter,
      setOsFilter,
      setDeviceFilter,
      setReferrerFilter,
      setDestinationFilter,
    ],
  );

  const removeFilter = React.useCallback(
    (categoryId: CategoryId, value: string) => {
      handleFilterChange(categoryId, value);
    },
    [handleFilterChange],
  );

  const getOptionValue = React.useCallback(
    (category: FilterCategory, option: FilterOption): string => {
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
    },
    [],
  );

  const getOptionLabel = React.useCallback(
    (category: FilterCategory, option: FilterOption): string => {
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
    },
    [],
  );

  const formatNameForUrl = React.useCallback((name: string): string => {
    return name.toLowerCase().replace(/\s+/g, "-");
  }, []);

  const getOptionIcon = React.useCallback(
    (category: FilterCategory, option: FilterOption): string | undefined => {
      switch (category.id) {
        case "slug_key":
          return (option as LinkAnalytics).url;
        case "country_key":
        case "city_key":
          return `https://flagcdn.com/w20/${(option as CountryAnalytics).country.toLowerCase()}.png`;
        case "continent_key":
          return `https://slugylink.github.io/slugy-assets/dist/colorful/continent/${formatNameForUrl((option as ContinentAnalytics).continent)}.svg`;
        case "browser_key":
          return `https://slugylink.github.io/slugy-assets/dist/colorful/browser/${formatNameForUrl((option as BrowserAnalytics).browser)}.svg`;
        case "os_key":
          return `https://slugylink.github.io/slugy-assets/dist/colorful/os/${formatNameForUrl((option as OsAnalytics).os)}.svg`;
        case "device_key":
          return `https://slugylink.github.io/slugy-assets/dist/colorful/device/${formatNameForUrl((option as DeviceAnalytics).device)}.svg`;
        default:
          return undefined;
      }
    },
    [formatNameForUrl],
  );

  const filteredCategories = React.useMemo(() => {
    return fillterCategory.filter((category) => {
      if (activeCategory && category.id !== activeCategory) return false;
      if (searchQuery) {
        if (activeCategory) {
          return category.options.some((option) =>
            getOptionLabel(category, option)
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
          );
        }
        return (
          category.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.options.some((option) =>
            getOptionLabel(category, option)
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
          )
        );
      }
      return true;
    });
  }, [fillterCategory, activeCategory, searchQuery, getOptionLabel]);

  const selectedFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="flex w-full flex-col items-start justify-between space-y-2">
      <div className="flex w-full items-center justify-between space-x-2">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center font-normal"
              >
                <Filter strokeWidth={1.5} className="mr-1 h-4 w-4" />
                Filter
                {selectedFilterCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px]">
                    {selectedFilterCount}
                  </span>
                )}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="relative w-[250px] p-2 transition-all duration-300 ease-in-out"
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
                  className="focus:ring-primary w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:ring-[1px] focus:outline-none"
                />
              </div>
              {activeCategory ? (
                <div className="animate-in slide-in-from-top-2 relative duration-200">
                  {filteredCategories
                    .filter((category) => category.id === activeCategory)
                    .map((category, index) => (
                      <DropdownMenuGroup key={index}>
                        <div
                          className="sticky top-0 z-50 mb-2"
                          style={{ position: "sticky", top: 0 }}
                        >
                          <DropdownMenuLabel
                            className="bg-primary-foreground flex cursor-pointer items-center justify-between rounded-md p-2 font-medium transition-colors duration-200"
                            onClick={() => setActiveCategory(null)}
                          >
                            <div className="flex items-center">
                              {category.icon}
                              <span className="ml-2 font-normal">
                                {category.label}
                              </span>
                            </div>
                            <div>
                              <ChevronsUpDown className="text-muted-foreground ml-auto h-4 w-4" />
                            </div>
                          </DropdownMenuLabel>
                        </div>
                        <div
                          className="custom-scrollbar animate-in slide-in-from-top-2 overflow-y-auto duration-200"
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
                              .map((option, index) => (
                                <FilterOptionItem
                                  key={index}
                                  category={category}
                                  option={option}
                                  isSelected={selectedFilters[
                                    category.id
                                  ]?.includes(getOptionValue(category, option))}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleFilterChange(
                                      category.id,
                                      getOptionValue(category, option),
                                    );
                                  }}
                                  getOptionValue={getOptionValue}
                                  getOptionLabel={getOptionLabel}
                                  getOptionIcon={getOptionIcon}
                                />
                              ))}
                          </div>
                        </div>
                      </DropdownMenuGroup>
                    ))}
                </div>
              ) : (
                <div
                  className="custom-scrollbar animate-in slide-in-from-top-2 overflow-y-auto duration-200"
                  style={{
                    maxHeight: "400px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgb(203 213 225) transparent",
                  }}
                >
                  {/* Group 1: Short Link, Destination URL */}
                  <DropdownMenuGroup>
                    {filteredCategories
                      .filter(
                        (category) =>
                          category.id === "slug_key" ||
                          category.id === "destination_key",
                      )
                      .map((category, index) => (
                        <DropdownMenuLabel
                          key={index}
                          className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-colors duration-200"
                          onClick={() => setActiveCategory(category.id)}
                        >
                          {category.icon}
                          <span className="ml-2 font-normal">
                            {category.label}
                          </span>
                        </DropdownMenuLabel>
                      ))}
                  </DropdownMenuGroup>

                  {/* Separator */}
                  {filteredCategories.some(
                    (category) =>
                      category.id === "slug_key" ||
                      category.id === "destination_key",
                  ) &&
                    filteredCategories.some(
                      (category) =>
                        category.id === "country_key" ||
                        category.id === "city_key" ||
                        category.id === "continent_key",
                    ) && <Separator className="my-1 bg-zinc-200/70" />}

                  {/* Group 2: Country, City, Continent */}
                  <DropdownMenuGroup>
                    {filteredCategories
                      .filter(
                        (category) =>
                          category.id === "country_key" ||
                          category.id === "city_key" ||
                          category.id === "continent_key",
                      )
                      .map((category, index) => (
                        <DropdownMenuLabel
                          key={index}
                          className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-colors duration-200"
                          onClick={() => setActiveCategory(category.id)}
                        >
                          {category.icon}
                          <span className="ml-2 font-normal">
                            {category.label}
                          </span>
                        </DropdownMenuLabel>
                      ))}
                  </DropdownMenuGroup>

                  {/* Separator */}
                  {filteredCategories.some(
                    (category) =>
                      category.id === "country_key" ||
                      category.id === "city_key" ||
                      category.id === "continent_key",
                  ) &&
                    filteredCategories.some(
                      (category) =>
                        category.id === "device_key" ||
                        category.id === "browser_key" ||
                        category.id === "os_key",
                    ) && <Separator className="my-1 bg-zinc-200/70" />}

                  {/* Group 3: Device, Browser, OS */}
                  <DropdownMenuGroup>
                    {filteredCategories
                      .filter(
                        (category) =>
                          category.id === "device_key" ||
                          category.id === "browser_key" ||
                          category.id === "os_key",
                      )
                      .map((category, index) => (
                        <DropdownMenuLabel
                          key={index}
                          className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-colors duration-200"
                          onClick={() => setActiveCategory(category.id)}
                        >
                          {category.icon}
                          <span className="ml-2 font-normal">
                            {category.label}
                          </span>
                        </DropdownMenuLabel>
                      ))}
                  </DropdownMenuGroup>

                  {/* Separator */}
                  {filteredCategories.some(
                    (category) =>
                      category.id === "device_key" ||
                      category.id === "browser_key" ||
                      category.id === "os_key",
                  ) &&
                    filteredCategories.some(
                      (category) => category.id === "referrer_key",
                    ) && <Separator className="my-1 bg-zinc-200/70" />}

                  {/* Group 4: Referrer */}
                  <DropdownMenuGroup>
                    {filteredCategories
                      .filter((category) => category.id === "referrer_key")
                      .map((category, index) => (
                        <DropdownMenuLabel
                          key={index}
                          className="flex cursor-pointer items-center rounded-md p-2 font-medium transition-colors duration-200"
                          onClick={() => setActiveCategory(category.id)}
                        >
                          {category.icon}
                          <span className="ml-2 font-normal">
                            {category.label}
                          </span>
                        </DropdownMenuLabel>
                      ))}
                  </DropdownMenuGroup>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent className="w-fit">
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedFilterCount > 0 && (
        <FilterSelectedButtons
          filterCategories={fillterCategory}
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

export default memo(FilterActions);
