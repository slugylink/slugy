"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import SearchInput from "./search-input";
import LinkActions from "./link-actions";
import LinkPagination from "./link-pagination";
import {
  EmptyState,
  LinkCardSkeleton,
  LinkList,
} from "./table-links-components";
import { ErrorState } from "./table-links-components";
import { useBulkOperation, useLayoutPreference } from "./table-links-hooks";
import { useWorkspaceStore } from "@/store/workspace";
import { fetcher } from "@/lib/fetcher";
import { DEFAULT_LIMIT, LAYOUT_OPTIONS, LayoutOption } from "@/constants/links";
import {
  Link,
  ApiResponse,
  SearchConfig,
  PaginationData,
} from "@/types/link-types";

const LinksTable = ({ workspaceslug }: { workspaceslug: string }) => {
  const searchParams = useSearchParams();
  const { setworkspaceslug } = useWorkspaceStore();
  const [isSelectModeOn, setIsSelectModeOn] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (workspaceslug) {
      setworkspaceslug(workspaceslug);
    }
  }, [workspaceslug, setworkspaceslug]);

  const searchConfig: SearchConfig = useMemo(() => {
    const page = Number(searchParams?.get("page_no") ?? "1");
    return {
      search: searchParams?.get("search") ?? "",
      showArchived: searchParams?.get("showArchived") ?? "false",
      sortBy: searchParams?.get("sortBy") ?? "date-created",
      offset: Math.max(0, (page - 1) * DEFAULT_LIMIT),
    };
  }, [searchParams]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    
    // Only add non-default parameters to reduce URL size
    if (searchConfig.search) {
      params.set("search", searchConfig.search);
    }
    if (searchConfig.showArchived === "true") {
      params.set("showArchived", "true");
    }
    if (searchConfig.sortBy !== "date-created") {
      params.set("sortBy", searchConfig.sortBy);
    }
    if (searchConfig.offset > 0) {
      params.set("offset", searchConfig.offset.toString());
    }
    
    const queryString = params.toString();
    return `/api/workspace/${workspaceslug}/link/get${queryString ? `?${queryString}` : ""}`;
  }, [searchConfig, workspaceslug]);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    apiUrl,
    fetcher,
    {
      dedupingInterval: 3000,
    },
  );

  const { links = [], totalLinks = 0, totalPages = 0 } = data ?? {};

  const linksWithQrCode: Link[] = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        qrCode: link.qrCode ?? { id: "", customization: "" },
      })),
    [links],
  );

  const handleSelectLink = useCallback((linkId: string) => {
    setSelectedLinks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
        if (newSet.size === 0) {
          setIsSelectModeOn(false);
        }
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedLinks((prev) => {
      const allSelected = prev.size === links.length && links.length > 0;
      return allSelected ? new Set() : new Set(links.map((l) => l.id));
    });
  }, [links]);

  const handleClearSelection = useCallback(() => {
    setSelectedLinks(new Set());
    setIsSelectModeOn(false);
  }, []);

  const pagination: PaginationData = {
    total_pages: totalPages,
    limit: DEFAULT_LIMIT,
    total_links: totalLinks,
  };

  const { layout, setLayout, isTransitioning } = useLayoutPreference();
  const { isProcessing, executeOperation } = useBulkOperation(workspaceslug);

  useEffect(() => {
    const handleLayoutChange = () => {
      if (typeof window === "undefined") return;

      const currentLayout = window.localStorage.getItem(
        "layout",
      ) as LayoutOption | null;
      if (
        currentLayout &&
        LAYOUT_OPTIONS.some((o) => o.value === currentLayout) &&
        currentLayout !== layout
      ) {
        setLayout(currentLayout);
      }
    };

    window.addEventListener("layoutChange", handleLayoutChange);
    return () => window.removeEventListener("layoutChange", handleLayoutChange);
  }, [layout, setLayout]);

  const handleArchive = useCallback(
    (linkIds: string[]) => executeOperation("archive", linkIds),
    [executeOperation],
  );
  const handleDelete = useCallback(
    (linkIds: string[]) => executeOperation("delete", linkIds),
    [executeOperation],
  );

  const isGridLayout = layout === "grid-cols-2";

  return (
    <section>
      {/* Header Actions */}
      <div className="flex w-full items-center justify-between gap-4 pb-8">
        <SearchInput />
        <LinkActions totalLinks={totalLinks} workspaceslug={workspaceslug} />
      </div>

      {/* Loading / Error / Data */}
      {isLoading && links.length === 0 ? (
        <LinkCardSkeleton />
      ) : error ? (
        <ErrorState error={error as Error} onRetry={() => mutate()} />
      ) : links.length > 0 ? (
        <LinkList
          key={`layout-${isGridLayout ? "grid" : "list"}`}
          links={linksWithQrCode}
          isGridLayout={isGridLayout}
          isLoading={isLoading}
          isSelectModeOn={isSelectModeOn}
          selectedLinks={selectedLinks}
          onSelect={handleSelectLink}
        />
      ) : (
        <EmptyState searchQuery={searchConfig.search} />
      )}

      {/* Pagination + Bulk Actions */}
      <LinkPagination
        isSelectModeOn={isSelectModeOn}
        setIsSelectModeOn={setIsSelectModeOn}
        selectedCount={selectedLinks.size}
        totalCount={links.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onArchive={handleArchive}
        onDelete={handleDelete}
        isProcessing={isProcessing}
        pagination={pagination}
        selectedLinks={selectedLinks}
      />
    </section>
  );
};

export default LinksTable;
