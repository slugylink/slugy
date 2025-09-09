import React, { useCallback, useEffect, useState } from "react";
import { useQueryState, parseAsBoolean, parseAsString } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DEBOUNCE_DELAY,
  DEFAULT_LAYOUT,
  DEFAULT_SORT,
  LAYOUT_OPTIONS,
  LayoutOption,
  SORT_OPTIONS,
  SortOptionKey,
} from "@/constants/links";

// Optimized layout hook with better performance
export const useLayout = (
  setLayout?: React.Dispatch<React.SetStateAction<string>>,
) => {
  const [currentLayout, setCurrentLayout] = useState<LayoutOption>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYOUT;
    const saved = window.localStorage.getItem("layout") as LayoutOption | null;
    return saved && LAYOUT_OPTIONS.some((o) => o.value === saved)
      ? saved
      : DEFAULT_LAYOUT;
  });

  const handleChangeLayout = useCallback(
    (layout: LayoutOption) => {
      setCurrentLayout(layout);
      setLayout?.(layout);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("layout", layout);
        // Dispatch custom event to notify other components of layout change
        window.dispatchEvent(new CustomEvent("layoutChange"));
      }
    },
    [setLayout],
  );

  return { currentLayout, handleChangeLayout };
};

// Optimized search state hook
export const useSearchState = () => {
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [showArchived, setShowArchived] = useQueryState(
    "showArchived",
    parseAsBoolean,
  );
  const [sortBy, setSortBy] = useQueryState("sortBy", {
    defaultValue: DEFAULT_SORT,
    parse: (value) => {
      const key = value as SortOptionKey;
      return SORT_OPTIONS.some((opt) => opt.value === key) ? key : DEFAULT_SORT;
    },
    serialize: (value) => value,
  });

  const [inputValue, setInputValue] = useState(searchQuery ?? "");
  const debouncedValue = useDebounce(inputValue, DEBOUNCE_DELAY);

  // Sync input field when "search" param changes
  useEffect(() => {
    if (searchQuery !== null) {
      setInputValue(searchQuery);
    }
  }, [searchQuery]);

  // Update URL when debounced value changes
  useEffect(() => {
    void setSearchQuery(debouncedValue || null);
  }, [debouncedValue, setSearchQuery]);

  // Clean up showArchived param
  useEffect(() => {
    if (showArchived === false) {
      void setShowArchived(null);
    }
  }, [showArchived, setShowArchived]);

  const handleToggleArchived = useCallback(
    (checked: boolean) => {
      void setShowArchived(checked || null);
    },
    [setShowArchived],
  );

  const handleSortChange = useCallback(
    (value: SortOptionKey) => {
      void setSortBy(value);
    },
    [setSortBy],
  );

  return {
    inputValue,
    setInputValue,
    showArchived: showArchived ?? false,
    sortBy,
    handleToggleArchived,
    handleSortChange,
  };
};
