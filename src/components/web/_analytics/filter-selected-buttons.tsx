"use client";

import type React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CategoryId, FilterCategory } from "./filter";
import { cn } from "@/lib/utils";

// Import the specific option types
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

  if (selectedFilterCount === 0) {
    return null;
  }

  const getOptionByValue = (
    category: FilterCategory,
    value: string,
  ): FilterOption | undefined => {
    // First, check if the category exists and has options
    if (!category?.options || category.options.length === 0) {
      console.warn(`No options found for category: ${category?.id}`);
      return undefined;
    }

    // Find the option based on category type
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

  const getOptionLabel = (category: FilterCategory, value: string): string => {
    const option = getOptionByValue(category, value);
    if (!option) return value;

    switch (category.id) {
      case "slug_key": {
        const typedOption = option as LinkAnalytics;
        return typedOption.slug ? `slugy.co/${typedOption.slug}` : value;
      }
      case "continent_key": {
        const typedOption = option as ContinentAnalytics;
        return typedOption.continent || value;
      }
      case "country_key": {
        const typedOption = option as CountryAnalytics;
        return typedOption.country || value;
      }
      case "city_key": {
        const typedOption = option as CityAnalytics;
        return typedOption.city || value;
      }
      case "browser_key": {
        const typedOption = option as BrowserAnalytics;
        return typedOption.browser || value;
      }
      case "os_key": {
        const typedOption = option as OsAnalytics;
        return typedOption.os || value;
      }
      case "device_key": {
        const typedOption = option as DeviceAnalytics;
        return typedOption.device || value;
      }
      case "referrer_key": {
        const typedOption = option as ReferrerAnalytics;
        return typedOption.referrer || value;
      }
      case "destination_key": {
        const typedOption = option as DestinationAnalytics;
        return typedOption.destination || value;
      }
      default:
        return value;
    }
  };

  //   const getOptionIcon = (
  //     category: FilterCategory,
  //     value: string,
  //   ): React.ReactNode => {
  //     const option = getOptionByValue(category, value);

  //     if (!option) {
  //       console.warn(
  //         `Option not found for value: ${value} in category: ${category.id}`,
  //       );
  //       return null;
  //     }

  //     switch (category.id) {
  //       case "slug_key": {
  //         const typedOption = option as LinkAnalytics;
  //         return typedOption.url ? (
  //           <UrlAvatar size={4} url={typedOption.url} />
  //         ) : null;
  //       }
  //       case "country_key": {
  //         const typedOption = option as CountryAnalytics;
  //         return typedOption.country ? (
  //           <CountryFlag code={typedOption.country} />
  //         ) : null;
  //       }
  //       case "city_key": {
  //         const typedOption = option as CityAnalytics;
  //         return typedOption.country ? (
  //           <CountryFlag allowCountry={false} code={typedOption.country} />
  //         ) : null;
  //       }
  //       case "continent_key": {
  //         const typedOption = option as ContinentAnalytics;
  //         return typedOption.continent ? (
  //           <span className="flex items-center">
  //             <NotoGlobeShowingAmericas className="mr-1 h-4 w-4" />
  //             <ContinentFlag code={typedOption.continent} />
  //           </span>
  //         ) : null;
  //       }
  //       case "browser_key": {
  //         const typedOption = option as BrowserAnalytics;
  //         return typedOption.browser ? (
  //           <Image
  //             src={`https://slugylink.github.io/slugy-assets/dist/colorful/browser/${formatNameForUrl(typedOption.browser)}.svg`}
  //             alt={typedOption.browser}
  //             width={16}
  //             height={16}
  //             className="h-4 w-4"
  //             onError={(e) => {
  //               (e.target as HTMLImageElement).src =
  //                 "https://slugylink.github.io/slugy-assets/dist/colorful/browser/default.svg";
  //             }}
  //           />
  //         ) : null;
  //       }
  //       case "os_key": {
  //         const typedOption = option as OsAnalytics;
  //         return typedOption.os ? (
  //           <Image
  //             src={`https://slugylink.github.io/slugy-assets/dist/colorful/os/${formatNameForUrl(typedOption.os)}.svg`}
  //             alt={typedOption.os}
  //             width={16}
  //             height={16}
  //             className="h-4 w-4"
  //             onError={(e) => {
  //               (e.target as HTMLImageElement).src =
  //                 "https://slugylink.github.io/slugy-assets/dist/colorful/os/default.svg";
  //             }}
  //           />
  //         ) : null;
  //       }
  //       default:
  //         return null;
  //     }
  //   };

  // Group filters by category for better organization
  const filtersByCategory = filterCategories.reduce<
    Array<{ category: FilterCategory; values: string[] }>
  >((acc, category) => {
    const values = selectedFilters[category.id] || [];
    if (values.length > 0) {
      acc.push({
        category,
        values,
      });
    }
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
              <Badge
                variant="outline"
                className="bg-muted/50 py-1 font-normal"
              >
                <span className="mr-1 flex items-center">{category.icon}</span>
                {category.label}
              </Badge>

              {values.map((value) => {
                // const optionIcon = getOptionIcon(category, value);
                const optionLabel = getOptionLabel(category, value);

                return (
                  <Badge
                    key={`${category.id}-${value}`}
                    variant="secondary"
                    className={cn(
                      "flex items-center font-normal gap-1.5 py-1 pl-2 pr-1 transition-all",
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
                    {/* {optionIcon && <span className="mr-1">{optionIcon}</span>} */}
                    <span className="max-w-[150px] truncate">
                      {optionLabel}
                    </span>
                    <button
                      onClick={() => onRemoveFilter(category.id, value)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted/20"
                      aria-label={`Remove ${optionLabel} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
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
