import { Search, Check, ArrowUpDown, Archive, Tag } from "lucide-react";
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
  LAYOUT_OPTIONS,
  SORT_OPTIONS,
  LayoutOption,
  SortOptionKey,
} from "@/constants/links";
import { COLOR_OPTIONS } from "@/constants/tag-colors";
import { FilterBar } from "@/utils/icons/filter-bar";

export type FilterTag = {
  id: string;
  name: string;
  color: string | null;
  linkCount?: number;
};

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
          "hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-md py-2 transition-colors",
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

function TagColorDot({ color }: { color: string | null }) {
  const option =
    COLOR_OPTIONS.find((item) => item.value === color) ?? COLOR_OPTIONS[0]!;
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full border"
      style={{ backgroundColor: option.value }}
      aria-hidden
    />
  );
}

export const TagsFilter = ({
  tags,
  selectedTagIds,
  onToggleTag,
  onClearTags,
  isLoading,
}: {
  tags: FilterTag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
  isLoading?: boolean;
}) => {
  const selectedCount = selectedTagIds.length;
  const triggerLabel =
    selectedCount === 0
      ? "All"
      : selectedCount === 1
        ? (tags.find((t) => t.id === selectedTagIds[0])?.name ?? "1 selected")
        : `${selectedCount} selected`;

  return (
    <div className="flex items-center justify-between border-t px-2 py-2.5">
      <div className="flex items-center gap-2">
        <Tag size={16} aria-hidden="true" />
        <span className="font-normal">Tags</span>
      </div>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex max-w-[140px] items-center rounded-sm border px-3 py-1.5 text-sm">
          <span className="truncate">{triggerLabel}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-56 w-48 overflow-y-auto">
          {isLoading ? (
            <DropdownMenuItem disabled>Loading tags…</DropdownMenuItem>
          ) : tags.length === 0 ? (
            <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
          ) : (
            <>
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <DropdownMenuItem
                    key={tag.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      onToggleTag(tag.id);
                    }}
                    className="flex cursor-pointer items-center justify-between gap-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <TagColorDot color={tag.color} />
                      <span className="truncate">{tag.name}</span>
                    </span>
                    {selected && <Check size={16} aria-hidden="true" />}
                  </DropdownMenuItem>
                );
              })}
              {selectedCount > 0 && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onClearTags();
                  }}
                  className="text-muted-foreground cursor-pointer border-t"
                >
                  Clear filters
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </div>
  );
};

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
  tags: FilterTag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
  tagsLoading?: boolean;
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
  tags,
  selectedTagIds,
  onToggleTag,
  onClearTags,
  tagsLoading,
}: DisplayOptionsDropdownProps) => (
  <DropdownMenu open={open} onOpenChange={onOpenChange}>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="default"
        className="relative ml-1 h-[39px] font-normal"
        aria-label="Display options"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <FilterBar />
        <span className="hidden md:inline">Display</span>
        {selectedTagIds.length > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
            {selectedTagIds.length}
          </span>
        )}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      className="w-[320px] space-y-1 rounded-lg p-2 text-sm shadow-sm"
      align="end"
    >
      <ViewModeSelector
        currentLayout={currentLayout}
        onLayoutChange={onLayoutChange}
      />
      <SortSelector sortBy={sortBy} onSortChange={onSortChange} />
      <ArchiveToggle checked={showArchived} onToggle={onToggleArchived} />
      <TagsFilter
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={onToggleTag}
        onClearTags={onClearTags}
        isLoading={tagsLoading}
      />
    </DropdownMenuContent>
  </DropdownMenu>
);
