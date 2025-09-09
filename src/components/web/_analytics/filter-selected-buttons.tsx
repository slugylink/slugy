"use client";

import React, { useMemo, useCallback, memo } from "react";
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

// Memoize continent names to prevent object recreation
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

// Memoize category background classes to prevent object recreation
const CATEGORY_BG_CLASSES = Object.freeze({
  slug_key: "bg-orange-200/40 hover:bg-orange-200/50",
  destination_key: "bg-orange-200/40 hover:bg-orange-200/50",
  continent_key: "bg-green-200/40 hover:bg-green-200/50 capitalize",
  country_key: "bg-green-200/40 hover:bg-green-200/50 capitalize",
  city_key: "bg-green-200/40 hover:bg-green-200/50 capitalize",
  browser_key: "bg-blue-200/40 hover:bg-blue-200/50 capitalize",
  os_key: "bg-blue-200/40 hover:bg-blue-200/50 capitalize",
  device_key: "bg-blue-200/40 hover:bg-blue-200/50 capitalize",
  referrer_key: "bg-red-200/40 hover:bg-red-200/50",
} as const);

// Memoized filter button component to prevent unnecessary re-renders
interface FilterButtonProps {
  category: FilterCategory;
  value: string;
  getOptionLabel: (category: FilterCategory, value: string) => string;
  onRemoveFilter: (categoryId: CategoryId, value: string) => void;
}

const FilterButton = memo<FilterButtonProps>(({
  category,
  value,
  getOptionLabel,
  onRemoveFilter
}) => {
  const optionLabel = getOptionLabel(category, value);

  return (
    <Button
      size="sm"
      variant="secondary"
      className={cn(
        "flex items-center gap-1.5 py-1 pr-1 pl-2 font-normal transition-all",
        CATEGORY_BG_CLASSES[category.id as keyof typeof CATEGORY_BG_CLASSES] ?? "",
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
});

FilterButton.displayName = "FilterButton";

const FilterSelectedButtons: React.FC<FilterSelectedButtonsProps> = ({
  filterCategories,
  selectedFilters,
  onRemoveFilter,
}) => {
  const selectedFilterCount = useMemo(
    () => Object.values(selectedFilters).flat().length,
    [selectedFilters],
  );

  const displayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  // Create lookup maps for faster option retrieval
  const optionLookupMaps = useMemo(() => {
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
  }, [filterCategories]);

  const getOptionByValue = useCallback(
    (category: FilterCategory, value: string): FilterOption | undefined => {
      return optionLookupMaps.get(category.id)?.get(value);
    },
    [optionLookupMaps],
  );

  const getOptionLabel = useCallback(
    (category: FilterCategory, value: string) => {
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
    },
    [displayNames, getOptionByValue],
  );

  // Group filters by category for rendering
  const filtersByCategory = useMemo(() => {
    return filterCategories.reduce<
      Array<{ category: FilterCategory; values: string[] }>
    >((acc, category) => {
      const values = selectedFilters[category.id] || [];
      if (values.length > 0) acc.push({ category, values });
      return acc;
    }, []);
  }, [filterCategories, selectedFilters]);

  if (selectedFilterCount === 0) return null;

  return (
    <div className="mt-3">
      <ScrollArea className="max-w-full pb-2">
        <div className="flex flex-wrap gap-2">
          {filtersByCategory.map(({ category, values }) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center gap-2"
              aria-label={`Selected filters for ${category.label}`}
            >
              <Button
                size="sm"
                variant="outline"
                className="bg-muted/50 font-normal"
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
