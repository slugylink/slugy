"use client";

import React, { useMemo, useCallback } from "react";
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

const CONTINENT_NAMES: Record<string, string> = {
  af: "Africa",
  an: "Antarctica",
  as: "Asia",
  eu: "Europe",
  na: "North America",
  oc: "Oceania",
  sa: "South America",
  unknown: "Unknown",
};

const CATEGORY_BG_CLASSES: Record<CategoryId, string> = {
  slug_key: "bg-orange-200/40 hover:bg-orange-200/50",
  destination_key: "bg-orange-200/40 hover:bg-orange-200/50",
  continent_key: "bg-green-200/40 hover:bg-green-200/50 capitalize",
  country_key: "bg-green-200/40 hover:bg-green-200/50 capitalize",
  city_key: "bg-green-200/40 hover:bg-green-200/50 capitalize",
  browser_key: "bg-blue-200/40 hover:bg-blue-200/50 capitalize",
  os_key: "bg-blue-200/40 hover:bg-blue-200/50 capitalize",
  device_key: "bg-blue-200/40 hover:bg-blue-200/50 capitalize",
  referrer_key: "bg-red-200/40 hover:bg-red-200/50",
};

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

  const getOptionByValue = useCallback(
    (category: FilterCategory, value: string): FilterOption | undefined => {
      if (!category?.options?.length) return undefined;
      return category.options.find((option) => {
        switch (category.id) {
          case "slug_key":
            return "slug" in option && option.slug === value;
          case "continent_key":
            return "continent" in option && option.continent === value;
          case "country_key":
            return "country" in option && option.country === value;
          case "city_key":
            return "city" in option && option.city === value;
          case "browser_key":
            return "browser" in option && option.browser === value;
          case "os_key":
            return "os" in option && option.os === value;
          case "device_key":
            return "device" in option && option.device === value;
          case "referrer_key":
            return "referrer" in option && option.referrer === value;
          case "destination_key":
            return "destination" in option && option.destination === value;
          default:
            return false;
        }
      });
    },
    [],
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
          return CONTINENT_NAMES[code] || code;
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
              {values.map((value) => {
                const optionLabel = getOptionLabel(category, value);
                return (
                  <Button
                    key={`${category.id}-${value}`}
                    size="sm"
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1.5 py-1 pr-1 pl-2 font-normal transition-all",
                      CATEGORY_BG_CLASSES[category.id] ?? "",
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
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FilterSelectedButtons;
