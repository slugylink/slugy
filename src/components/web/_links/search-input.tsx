"use client";

import { useState, memo } from "react";
import useSWR from "swr";
import { useLayout, useSearchState } from "@/hooks/search-input-hooks";
import { useWorkspaceStore } from "@/store/workspace";
import { fetcher } from "@/lib/fetcher";
import {
  SearchInputField,
  DisplayOptionsDropdown,
  type FilterTag,
} from "./search-input-components";

const SearchInput = memo(() => {
  const [displayOpen, setDisplayOpen] = useState(false);
  const { workspaceslug } = useWorkspaceStore();
  const { currentLayout, handleChangeLayout } = useLayout();
  const {
    inputValue,
    setInputValue,
    showArchived,
    sortBy,
    selectedTagIds,
    handleToggleArchived,
    handleSortChange,
    handleToggleTag,
    handleClearTags,
  } = useSearchState();

  const { data: tags, isLoading: tagsLoading } = useSWR<FilterTag[]>(
    workspaceslug ? `/api/workspace/${workspaceslug}/tags` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  return (
    <div className="flex items-center gap-1" role="search">
      <SearchInputField value={inputValue} onChange={setInputValue} />

      <DisplayOptionsDropdown
        open={displayOpen}
        onOpenChange={setDisplayOpen}
        currentLayout={currentLayout}
        onLayoutChange={handleChangeLayout}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        showArchived={showArchived}
        onToggleArchived={handleToggleArchived}
        tags={tags ?? []}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
        tagsLoading={tagsLoading}
      />
    </div>
  );
});

SearchInput.displayName = "SearchInput";

export default SearchInput;
