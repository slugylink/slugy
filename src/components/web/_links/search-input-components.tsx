import { Search, Check, ArrowUpDown, Archive } from "lucide-react";
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
import { LAYOUT_OPTIONS, SORT_OPTIONS, LayoutOption, SortOptionKey } from "@/constants/links";
import { FilterBar } from "@/utils/icons/filter-bar";

export const ViewModeSelector = ({
  currentLayout,
  onLayoutChange,
}: {
  currentLayout: LayoutOption;
  onLayoutChange: (layout: LayoutOption) => void;
}) => (
  <div className="grid grid-cols-2 gap-1">
    {LAYOUT_OPTIONS.map(({ value, icon: Icon, label }) => (
      <button
        key={value}
        onClick={() => onLayoutChange(value)}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md py-2 transition-colors hover:bg-muted/50",
          currentLayout === value && "bg-muted border",
        )}
        aria-pressed={currentLayout === value}
        aria-label={`Switch to ${label.toLowerCase()} view`}
        type="button"
      >
        <Icon />
        <span className="mt-1 text-xs">{label}</span>
      </button>
    ))}
  </div>
);

export const SortSelector = ({
  sortBy,
  onSortChange,
}: {
  sortBy: SortOptionKey;
  onSortChange: (value: SortOptionKey) => void;
}) => {
  const currentSortOption = SORT_OPTIONS.find((opt) => opt.value === sortBy);

  return (
    <div className="flex items-center justify-between border-t border-b px-2 py-2.5">
      <div className="flex items-center gap-2">
        <ArrowUpDown size={16} aria-hidden="true" />
        <span className="font-normal">Ordering</span>
      </div>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex items-center rounded-sm border px-3 py-1.5 text-sm">
          <span>{currentSortOption?.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {SORT_OPTIONS.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => onSortChange(value)}
              className="flex cursor-pointer items-center justify-between"
            >
              <span>{label}</span>
              {sortBy === value && <Check size={16} aria-hidden="true" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </div>
  );
};

export const ArchiveToggle = ({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between px-2 py-2">
    <div className="flex items-center gap-2">
      <Archive size={15} aria-hidden="true" />
      <span className="font-normal">Show archived links</span>
    </div>
    <Switch
      className="cursor-pointer"
      checked={checked}
      onCheckedChange={onToggle}
      aria-checked={checked}
      aria-label={checked ? "Hide archived links" : "Show archived links"}
    />
  </div>
);

export const SearchInputField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="relative">
    <Search
      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
      aria-hidden="true"
    />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[39px] w-full pl-9 shadow-none md:w-[300px]"
      placeholder="Search links..."
      aria-label="Search links"
      type="search"
    />
  </div>
);

interface DisplayOptionsDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLayout: LayoutOption;
  onLayoutChange: (layout: LayoutOption) => void;
  sortBy: SortOptionKey;
  onSortChange: (value: SortOptionKey) => void;
  showArchived: boolean;
  onToggleArchived: (checked: boolean) => void;
}

export const DisplayOptionsDropdown = ({
  open,
  onOpenChange,
  currentLayout,
  onLayoutChange,
  sortBy,
  onSortChange,
  showArchived,
  onToggleArchived,
}: DisplayOptionsDropdownProps) => (
  <DropdownMenu open={open} onOpenChange={onOpenChange}>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="default"
        className="ml-1 h-[39px] font-normal"
        aria-label="Display options"
        aria-expanded={open}
        aria-haspopup="true"
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
        onLayoutChange={onLayoutChange}
      />
      <SortSelector sortBy={sortBy} onSortChange={onSortChange} />
      <ArchiveToggle
        checked={showArchived}
        onToggle={onToggleArchived}
      />
    </DropdownMenuContent>
  </DropdownMenu>
);
