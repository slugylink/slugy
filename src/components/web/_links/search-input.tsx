"use client";

import { useState, memo } from "react";
import { useLayout, useSearchState } from "@/hooks/search-input-hooks";
import {
  SearchInputField,
  DisplayOptionsDropdown,
} from "./search-input-components";

const SearchInput = memo(() => {
  const [displayOpen, setDisplayOpen] = useState(false);
  const { currentLayout, handleChangeLayout } = useLayout();
  const {
    inputValue,
    setInputValue,
    showArchived,
    sortBy,
    handleToggleArchived,
    handleSortChange,
  } = useSearchState();

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
      />
    </div>
  );
});

SearchInput.displayName = "SearchInput";

export default SearchInput;
