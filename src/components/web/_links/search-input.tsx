"use client";

import React, { useState } from "react";

// Hooks
import { useLayout, useSearchState } from "@/hooks/search-input-hooks";

// Components
import {
  SearchInputField,
  DisplayOptionsDropdown,
} from "./search-input-components";

export interface SearchInputProps {
  workspaceslug?: string;
}

/* ---------------- Main Search Input ---------------- */
const SearchInput: React.FC<SearchInputProps> = React.memo(() => {
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
