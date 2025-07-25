"use client";

import type React from "react";
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

const FilterSelectedButtons: React.FC<FilterSelectedButtonsProps> = ({
  filterCategories,
  selectedFilters,
  onRemoveFilter,
}) => {
  const selectedFilterCount = Object.values(selectedFilters).flat().length;
  if (selectedFilterCount === 0) return null;

  const getOptionByValue = (
    category: FilterCategory,
    value: string,
  ): FilterOption | undefined => {
    if (!category?.options || category.options.length === 0) return undefined;
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
  };

  // Mapping from continent code to full name
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

  const getOptionLabel = (category: FilterCategory, value: string): string => {
    const option = getOptionByValue(category, value);
    if (!option) return value;
    switch (category.id) {
      case "slug_key":
        return (option as LinkAnalytics).slug || value;
      case "continent_key": {
        const code = ((option as ContinentAnalytics).continent || value).toLowerCase();
        return CONTINENT_NAMES[code] || code;
      }
      case "country_key": {
        const code = (option as CountryAnalytics).country || value;
        try {
          const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
          return displayNames.of(code.toUpperCase()) || code;
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

  // Group filters by category for display
  const filtersByCategory = filterCategories.reduce<
    Array<{ category: FilterCategory; values: string[] }>
  >((acc, category) => {
    const values = selectedFilters[category.id] || [];
    if (values.length > 0) acc.push({ category, values });
    return acc;
  }, []);

  return (
    <div className="mt-3">
      <ScrollArea className="max-w-full pb-2">
        <div className="flex flex-wrap gap-2">
          {filtersByCategory.map(({ category, values }) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                size="sm"
                variant="outline"
                className="bg-muted/50 font-normal"
              >
                <span className="mr-1 flex items-center">{category.icon}</span>
                {category.label}
              </Button>
              {values.map((value) => {
                const optionLabel = getOptionLabel(category, value);
                return (
                  <Button
                    size="sm"
                    key={`${category.id}-${value}`}
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1.5 py-1 pr-1 pl-2 font-normal transition-all",
                      {
                        "bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900":
                          category.id === "slug_key",
                        "bg-green-100 hover:bg-green-200 dark:bg-green-950 dark:hover:bg-green-900":
                          category.id === "continent_key",
                        "bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900":
                          category.id === "country_key",
                        "bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900":
                          category.id === "city_key",
                        "bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900":
                          category.id === "browser_key",
                        "bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900":
                          category.id === "os_key",
                      },
                    )}
                  >
                    <span className="max-w-[150px] truncate">
                      {optionLabel}
                    </span>
                    <button
                      onClick={() => onRemoveFilter(category.id, value)}
                      className="hover:bg-muted/20 ml-1 cursor-pointer rounded-full p-0.5"
                      aria-label={`Remove ${optionLabel} filter`}
                      type="button"
                    >
                      <X className="text-muted-foreground h-3 w-3 cursor-pointer" />
                    </button>
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
