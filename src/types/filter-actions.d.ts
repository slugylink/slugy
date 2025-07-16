import type React from "react";

// Base interface for all options
export interface BaseOption {
  clicks?: number;
}

// Specific option interfaces
export interface LinkAnalytics extends BaseOption {
  slug: string;
  url: string;
  icon?: string;
}

export interface ContinentAnalytics extends BaseOption {
  continent: string;
}

export interface CountryAnalytics extends BaseOption {
  country: string;
}

export interface CityAnalytics extends BaseOption {
  city: string;
  country: string;
}

export interface BrowserAnalytics extends BaseOption {
  browser: string;
}

export interface OsAnalytics extends BaseOption {
  os: string;
}

export interface DeviceAnalytics extends BaseOption {
  device: string;
}

export interface ReferrerAnalytics extends BaseOption {
  referrer: string;
}

export interface DestinationAnalytics extends BaseOption {
  destination: string;
}

// Union type for all possible option types
export type FilterOption =
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
  | "continent_key"
  | "country_key"
  | "city_key"
  | "browser_key"
  | "os_key"
  | "device_key"
  | "referrer_key"
  | "destination_key";

// Interface for filter categories
export interface FilterCategory {
  id: CategoryId;
  label: string;
  icon: React.ReactNode;
  options: FilterOption[];
}
