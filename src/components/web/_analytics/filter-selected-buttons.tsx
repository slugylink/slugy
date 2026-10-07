"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CategoryId, FilterCategory } from "./filter";
import { cn } from "@/lib/utils";
import UrlAvatar from "@/components/web/url-avatar";
import CountryFlag from "./country-flag";
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
  TriggerAnalytics,
  DestinationAnalytics,
} from "@/types/filter-actions";
import { triggerLabel } from "@/lib/ai/analytics-ask-prompt";
import { useState } from "react";

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

interface FilterPillProps {
  category: FilterCategory;
  value: string;
  option: FilterOption | undefined;
  getOptionLabel: (category: FilterCategory, value: string) => string;
  onRemoveFilter: (categoryId: CategoryId, value: string) => void;
}

const formatAssetName = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-");

/** Small value icon for the pill (flag / favicon / browser / os / device glyph). */
const FilterValueIcon = ({
  category,
  value,
  option,
}: {
  category: FilterCategory;
  value: string;
  option: FilterOption | undefined;
}) => {
  switch (category.id) {
    case "slug_key": {
      const url = (option as LinkAnalytics | undefined)?.url || value;
      return <UrlAvatar size={5} url={url} />;
    }
    case "country_key":
      return <CountryFlag allowCountry={false} code={value} size={14} />;
    case "city_key": {
      const country = (option as CityAnalytics | undefined)?.country;
      return country ? (
        <CountryFlag allowCountry={false} code={country} size={14} />
      ) : null;
    }
    case "continent_key":
      // No distinct glyph available (ContinentFlag renders text only);
      // the category icon already identifies the dimension.
      return null;
    case "browser_key":
    case "os_key":
    case "device_key": {
      const folder =
        category.id === "browser_key"
          ? "browser"
          : category.id === "os_key"
            ? "os"
            : "device";
      return (
        <AssetImage
          src={`https://slugylink.github.io/slugy-assets/dist/colorful/${folder}/${formatAssetName(value)}.svg`}
          alt={value}
        />
      );
    }
    case "referrer_key":
    case "destination_key":
      return <UrlAvatar size={5} url={value} />;
    case "trigger_key":
      // Category icon already identifies the dimension; value is a short label.
      return null;
    default:
      return null;
  }
};

const AssetImage = ({ src, alt }: { src: string; alt: string }) => {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <Image
      src={src}
      alt={alt}
      width={16}
      height={16}
      loading="lazy"
      className="h-4 w-4"
      onError={() => setError(true)}
    />
  );
};

/**
 * Dub-style segmented pill: `[icon] Label | is | [icon] value | x`.
 * The whole pill (minus X) is display-only; X removes the filter.
 */
const FilterPill = ({
  category,
  value,
  option,
  getOptionLabel,
  onRemoveFilter,
}: FilterPillProps) => {
  const rawLabel = getOptionLabel(category, value);
  const optionLabel = rawLabel
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "");

  return (
    <div
      className={cn(
        "flex h-8 items-center overflow-hidden rounded-lg border border-zinc-200 bg-white",
        "text-xs dark:border-zinc-800 dark:bg-zinc-900",
      )}
      aria-label={`Active filter: ${category.label} is ${optionLabel}`}
    >
      <span className="flex items-center gap-1.5 px-2.5 font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200">
        <span className="flex items-center [&_svg]:h-3.5 [&_svg]:w-3.5">
          {category.icon}
        </span>
        {category.label}
      </span>
      <span className="flex h-full items-center bg-zinc-100 px-2 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        is
      </span>
      <span className="flex items-center gap-1.5 px-2.5 whitespace-nowrap text-zinc-900 dark:text-zinc-100">
        <FilterValueIcon category={category} value={value} option={option} />
        <span className="max-w-[180px] truncate">{optionLabel}</span>
      </span>
      <button
        type="button"
        aria-label={`Remove filter: ${optionLabel}`}
        onClick={() => onRemoveFilter(category.id, value)}
        className="flex h-full items-center px-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" focusable={false} />
      </button>
    </div>
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
          case "trigger_key":
            key = (option as TriggerAnalytics).trigger;
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
      case "trigger_key":
        return triggerLabel((option as TriggerAnalytics).trigger || value);
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
          {filtersByCategory.flatMap(({ category, values }) =>
            values.map((value) => (
              <FilterPill
                key={`${category.id}-${value}`}
                category={category}
                value={value}
                option={getOptionByValue(category, value)}
                getOptionLabel={getOptionLabel}
                onRemoveFilter={onRemoveFilter}
              />
            )),
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FilterSelectedButtons;
