"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Check, ArrowUpDown, Archive } from "lucide-react";
import { useQueryState, parseAsBoolean, parseAsString } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DEBOUNCE_DELAY,
  DEFAULT_LAYOUT,
  DEFAULT_SORT,
  LAYOUT_OPTIONS,
  LayoutOption,
  SORT_OPTIONS,
  SortOptionKey,
} from "@/constants/links";
import { FilterBar } from "@/utils/icons/filter-bar";

export interface SearchInputProps {
  workspaceslug: string;
  setLayout?: React.Dispatch<React.SetStateAction<string>>;
}

// Custom hooks
const useLayout = (
  setLayout?: React.Dispatch<React.SetStateAction<string>>,
) => {
  const [currentLayout, setCurrentLayout] = useState<LayoutOption>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYOUT;
    const saved = window.localStorage.getItem("layout") as LayoutOption;
    return LAYOUT_OPTIONS.some((opt) => opt.value === saved)
      ? saved
      : DEFAULT_LAYOUT;
  });

  const handleChangeLayout = useCallback(
    (layout: LayoutOption) => {
      setCurrentLayout(layout);
      setLayout?.(layout);
      window.localStorage.setItem("layout", layout);
    },
    [setLayout],
  );

  return { currentLayout, handleChangeLayout };
};

const useSearchState = () => {
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

  // Sync input with URL params
  useEffect(() => {
    if (searchQuery !== null) {
      setInputValue(searchQuery);
    }
  }, [searchQuery]);

  // Update URL when debounced value changes
  useEffect(() => {
    void setSearchQuery(debouncedValue || null);
  }, [debouncedValue, setSearchQuery]);

  // Clean up URL params
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

// Components
const ViewModeSelector: React.FC<{
  currentLayout: LayoutOption;
  onLayoutChange: (layout: LayoutOption) => void;
}> = React.memo(({ currentLayout, onLayoutChange }) => (
  <div className="grid grid-cols-2 gap-1">
    {LAYOUT_OPTIONS.map(({ value, icon: Icon, label }) => (
      <button
        key={value}
        onClick={() => onLayoutChange(value)}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md py-2 transition-colors",
          currentLayout === value ? "bg-muted border" : "hover:bg-muted/50",
        )}
        aria-pressed={currentLayout === value}
        aria-label={`Switch to ${label.toLowerCase()} view`}
      >
        <Icon />
        <span className="mt-1 text-xs">{label}</span>
      </button>
    ))}
  </div>
));

ViewModeSelector.displayName = "ViewModeSelector";

const SortSelector: React.FC<{
  sortBy: SortOptionKey;
  onSortChange: (value: SortOptionKey) => void;
}> = React.memo(({ sortBy, onSortChange }) => {
  const currentSortOption = SORT_OPTIONS.find((opt) => opt.value === sortBy);

  return (
    <div className="flex items-center justify-between border-t border-b px-2 py-2.5">
      <div className="flex items-center gap-2">
        <ArrowUpDown size={16} />
        <span className="font-normal">Ordering</span>
      </div>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex items-center rounded-sm border px-3 py-1.5 text-sm">
          <span>{currentSortOption?.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="">
          {SORT_OPTIONS.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onSortChange(value)}
              className="flex cursor-pointer items-center justify-between"
            >
              <span>{label}</span>
              {sortBy === value && <Check size={16} />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </div>
  );
});

SortSelector.displayName = "SortSelector";

const ArchiveToggle: React.FC<{
  checked: boolean;
  onToggle: (checked: boolean) => void;
}> = React.memo(({ checked, onToggle }) => (
  <div className="flex items-center justify-between px-2 py-2">
    <div className="flex items-center gap-2">
      <Archive size={15} />
      <span className="font-normal">Show archived links</span>
    </div>
    <Switch
      className="cursor-pointer"
      checked={checked}
      onCheckedChange={onToggle}
    />
  </div>
));

ArchiveToggle.displayName = "ArchiveToggle";

// Main component
const SearchInput: React.FC<SearchInputProps> = ({ setLayout }) => {
  const [displayOpen, setDisplayOpen] = useState(false);
  const { currentLayout, handleChangeLayout } = useLayout(setLayout);
  const {
    inputValue,
    setInputValue,
    showArchived,
    sortBy,
    handleToggleArchived,
    handleSortChange,
  } = useSearchState();

  return (
    <div className="flex items-center gap-1">
      {/* Search Input */}
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="h-[39px] w-full pl-9 shadow-none md:w-[300px]"
          placeholder="Search links..."
          aria-label="Search links"
        />
      </div>

      {/* Display Options Dropdown */}
      <DropdownMenu open={displayOpen} onOpenChange={setDisplayOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={"default"}
            className="ml-1 h-[39px] font-normal"
            aria-label="Display options"
          >
            <FilterBar />
            <span className="hidden md:inline">Display</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[320px] space-y-3 rounded-lg p-2 text-sm shadow-sm"
          align="end"
        >
          <ViewModeSelector
            currentLayout={currentLayout}
            onLayoutChange={handleChangeLayout}
          />

          <SortSelector sortBy={sortBy} onSortChange={handleSortChange} />

          <ArchiveToggle
            checked={showArchived}
            onToggle={handleToggleArchived}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SearchInput;
