"use client";

import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CategoryId, FilterCategory } from "./filter";
import { cn } from "@/lib/utils";
import type {
  LinkAnalytics,
  ContinentAnalytics,
  CountryAnalytics,
  CityAnalytics,
  BrowserAnalytics,
  OsAnalytics,
  FilterOption,
  DeviceAnalytics,
  ReferrerAnalytics,
  DestinationAnalytics,
} from "@/types/filter-actions";
import { Button } from "@/components/ui/button";

interface FilterSelectedButtonsProps {
  filterCategories: FilterCategory[];
  selectedFilters: Record<CategoryId, string[]>;
  onRemoveFilter: (categoryId: CategoryId, value: string) => void;
}

const CONTINENT_NAMES = Object.freeze({
  af: "Africa",
  an: "Antarctica",
  as: "Asia",
  eu: "Europe",
  na: "North America",
  oc: "Oceania",
  sa: "South America",
  unknown: "Unknown",
} as const);

const CATEGORY_BG_CLASSES = Object.freeze({
  slug_key:
    "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700",
  destination_key:
    "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700",
  continent_key:
    "bg-zinc-100 hover:bg-zinc-200/70 capitalize dark:bg-zinc-800 dark:hover:bg-zinc-700",
  country_key:
    "bg-zinc-100 hover:bg-zinc-200/70 capitalize dark:bg-zinc-800 dark:hover:bg-zinc-700",
  city_key:
    "bg-zinc-100 hover:bg-zinc-200/70 capitalize dark:bg-zinc-800 dark:hover:bg-zinc-700",
  browser_key:
    "bg-zinc-100 hover:bg-zinc-200/70 capitalize dark:bg-zinc-800 dark:hover:bg-zinc-700",
  os_key:
    "bg-zinc-100 hover:bg-zinc-200/70 capitalize dark:bg-zinc-800 dark:hover:bg-zinc-700",
  device_key:
    "bg-zinc-100 hover:bg-zinc-200/70 capitalize dark:bg-zinc-800 dark:hover:bg-zinc-700",
  referrer_key:
    "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700",
} as const);

interface FilterButtonProps {
  category: FilterCategory;
  value: string;
  getOptionLabel: (category: FilterCategory, value: string) => string;
  onRemoveFilter: (categoryId: CategoryId, value: string) => void;
}

const FilterButton = ({
  category,
  value,
  getOptionLabel,
  onRemoveFilter,
}: FilterButtonProps) => {
  const optionLabel = getOptionLabel(category, value);

  return (
    <Button
      size="sm"
      variant="secondary"
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-md border border-transparent py-0 pr-1.5 pl-2 text-xs font-normal transition-colors",
        CATEGORY_BG_CLASSES[category.id as keyof typeof CATEGORY_BG_CLASSES] ??
          "",
      )}
      type="button"
      aria-label={`Remove filter: ${optionLabel}`}
      onClick={() => onRemoveFilter(category.id, value)}
    >
      <span className="max-w-[150px] truncate">
        {optionLabel
          .replace("https://", "")
          .replace("http://", "")
          .replace("www.", "")}
      </span>
      <X
        className="text-muted-foreground h-3 w-3 cursor-pointer"
        aria-hidden="true"
        focusable={false}
      />
    </Button>
  );
};

const FilterSelectedButtons = ({
  filterCategories,
  selectedFilters,
  onRemoveFilter,
}: FilterSelectedButtonsProps) => {
  const selectedFilterCount = Object.values(selectedFilters).flat().length;

  const displayNames = (() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  })();

  const optionLookupMaps = (() => {
    const maps = new Map<CategoryId, Map<string, FilterOption>>();

    filterCategories.forEach((category) => {
      const categoryMap = new Map<string, FilterOption>();
      category.options.forEach((option) => {
        let key: string;
        switch (category.id) {
          case "slug_key":
            key = (option as LinkAnalytics).slug;
            break;
          case "continent_key":
            key = (option as ContinentAnalytics).continent;
            break;
          case "country_key":
            key = (option as CountryAnalytics).country;
            break;
          case "city_key":
            key = (option as CityAnalytics).city;
            break;
          case "browser_key":
            key = (option as BrowserAnalytics).browser;
            break;
          case "os_key":
            key = (option as OsAnalytics).os;
            break;
          case "device_key":
            key = (option as DeviceAnalytics).device;
            break;
          case "referrer_key":
            key = (option as ReferrerAnalytics).referrer;
            break;
          case "destination_key":
            key = (option as DestinationAnalytics).destination;
            break;
          default:
            return;
        }
        categoryMap.set(key, option);
      });
      maps.set(category.id, categoryMap);
    });

    return maps;
  })();

  const getOptionByValue = (
    category: FilterCategory,
    value: string,
  ): FilterOption | undefined => {
    return optionLookupMaps.get(category.id)?.get(value);
  };

  const getOptionLabel = (category: FilterCategory, value: string) => {
    const option = getOptionByValue(category, value);
    if (!option) return value;
    switch (category.id) {
      case "slug_key":
        return (option as LinkAnalytics).slug || value;
      case "continent_key": {
        const code = (
          (option as ContinentAnalytics).continent || value
        ).toLowerCase();
        return CONTINENT_NAMES[code as keyof typeof CONTINENT_NAMES] || code;
      }
      case "country_key": {
        const code = (option as CountryAnalytics).country || value;
        try {
          return displayNames?.of(code.toUpperCase()) || code;
        } catch {
          return code;
        }
      }
      case "city_key":
        return (option as CityAnalytics).city || value;
      case "browser_key":
        return (option as BrowserAnalytics).browser || value;
      case "os_key":
        return (option as OsAnalytics).os || value;
      case "device_key":
        return (option as DeviceAnalytics).device || value;
      case "referrer_key":
        return (option as ReferrerAnalytics).referrer || value;
      case "destination_key":
        return (option as DestinationAnalytics).destination || value;
      default:
        return value;
    }
  };

  const filtersByCategory = filterCategories.reduce<
    Array<{ category: FilterCategory; values: string[] }>
  >((acc, category) => {
    const values = selectedFilters[category.id] || [];
    if (values.length > 0) acc.push({ category, values });
    return acc;
  }, []);

  if (selectedFilterCount === 0) return null;

  return (
    <div className="mt-2">
      <ScrollArea className="max-w-full pb-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {filtersByCategory.map(({ category, values }) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center gap-1.5"
              aria-label={`Selected filters for ${category.label}`}
            >
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-md border-zinc-200 bg-white text-xs font-medium"
                aria-disabled="true"
                tabIndex={-1}
              >
                <span className="mr-1 flex items-center">{category.icon}</span>
                {category.label}
              </Button>
              {values.map((value) => (
                <FilterButton
                  key={`${category.id}-${value}`}
                  category={category}
                  value={value}
                  getOptionLabel={getOptionLabel}
                  onRemoveFilter={onRemoveFilter}
                />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FilterSelectedButtons;
