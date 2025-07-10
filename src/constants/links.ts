import { GridIcon } from "@/utils/icons/grids";
import { ListsIcon } from "@/utils/icons/lists";

export type SortOptionKey = "date-created" | "total-clicks" | "last-clicked";
export type SortOptionLabel = "Date created" | "Total clicks" | "Last clicked";
export type LayoutOption = "grid-cols-1" | "grid-cols-2";

export const DEFAULT_LIMIT = 20;
export const DEFAULT_LAYOUT = "grid-cols-1";

// Types

interface SortOption {
  value: SortOptionKey;
  label: string;
}

interface LayoutConfig {
  value: LayoutOption;
  icon: React.ComponentType;
  label: string;
}

// Constants
export const SORT_OPTIONS: SortOption[] = [
  { value: "date-created", label: "Date created" },
  { value: "total-clicks", label: "Total clicks" },
  { value: "last-clicked", label: "Last clicked" },
];

export const LAYOUT_OPTIONS: LayoutConfig[] = [
  { value: "grid-cols-1", icon: ListsIcon, label: "Lists" },
  { value: "grid-cols-2", icon: GridIcon, label: "Grids" },
];

export const DEFAULT_SORT: SortOptionKey = "date-created";
export const DEBOUNCE_DELAY = 300;
