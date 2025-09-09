"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

// Components
import SearchInput from "./search-input";
import LinkActions from "./link-actions";
import LinkPagination from "./link-pagination";

// UI Components
import {
  EmptyState,
  LinkCardSkeleton,
  LinkList,
} from "./table-links-components";

// Hooks
import { useBulkOperation, useLayoutPreference } from "./table-links-hooks";

// Stores
import { useWorkspaceStore } from "@/store/workspace";

// Utils
import { fetcher } from "@/lib/fetcher";

// Constants
import { DEFAULT_LIMIT, LAYOUT_OPTIONS, LayoutOption } from "@/constants/links";

// Types
import { Link, ApiResponse, SearchConfig, PaginationData } from "@/types/link-types";

const LinksTable = ({ workspaceslug }: { workspaceslug: string }) => {
  const searchParams = useSearchParams();
  const { setworkspaceslug } = useWorkspaceStore();
  const [isSelectModeOn, setIsSelectModeOn] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  // Sync workspace slug with store - optimized with early return
  useEffect(() => {
    if (workspaceslug) {
      setworkspaceslug(workspaceslug);
    }
  }, [workspaceslug, setworkspaceslug]);

  // Build search config from URL params - optimized memoization
  const searchConfig: SearchConfig = useMemo(() => {
    const page = Number(searchParams?.get("page_no") ?? "1");
    return {
      search: searchParams?.get("search") ?? "",
      showArchived: searchParams?.get("showArchived") ?? "false",
      sortBy: searchParams?.get("sortBy") ?? "date-created",
      offset: Math.max(0, (page - 1) * DEFAULT_LIMIT),
    };
  }, [searchParams]);

  // API URL for SWR - optimized with better dependency tracking
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      search: searchConfig.search,
      showArchived: searchConfig.showArchived,
      sortBy: searchConfig.sortBy,
      offset: searchConfig.offset.toString(),
      limit: DEFAULT_LIMIT.toString(),
    });
    return `/api/workspace/${workspaceslug}/link/get?${params.toString()}`;
  }, [workspaceslug, searchConfig]);

  // Fetch data with optimized SWR config
  const { data, error, isLoading } = useSWR<ApiResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3000,
    }
  );

  const { links = [], totalLinks = 0, totalPages = 0 } = data ?? {};

  // Ensure QR codes with optimized memoization
  const linksWithQrCode = useMemo<Link[]>(
    () =>
      links.map((link) => ({
        ...link,
        qrCode: link.qrCode ?? { id: "", customization: "" },
      })),
    [links],
  );

  // Optimized selection handlers with better performance
  const handleSelectLink = useCallback((linkId: string) => {
    setSelectedLinks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
        // Auto-disable select mode if no links selected
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

  // Optimized pagination data
  const pagination: PaginationData = useMemo(
    () => ({
      total_pages: totalPages,
      limit: DEFAULT_LIMIT,
      total_links: totalLinks,
    }),
    [totalPages, totalLinks],
  );

  // Layout & bulk actions with optimized hooks
  const { layout, setLayout, isTransitioning } = useLayoutPreference();
  const { isProcessing, executeOperation } = useBulkOperation(workspaceslug);

  // Optimized layout change listener with better performance
  useEffect(() => {
    const handleLayoutChange = () => {
      if (typeof window === "undefined") return;

      const currentLayout = window.localStorage.getItem("layout") as LayoutOption | null;
      if (currentLayout &&
          LAYOUT_OPTIONS.some((o) => o.value === currentLayout) &&
          currentLayout !== layout) {
        setLayout(currentLayout);
      }
    };

    window.addEventListener("layoutChange", handleLayoutChange);
    return () => window.removeEventListener("layoutChange", handleLayoutChange);
  }, [layout, setLayout]);

  // Optimized operation handlers
  const handleArchive = useCallback(
    (linkIds: string[]) => executeOperation("archive", linkIds),
    [executeOperation],
  );

  const handleDelete = useCallback(
    (linkIds: string[]) => executeOperation("delete", linkIds),
    [executeOperation],
  );

  // Memoized layout check for better performance
  const isGridLayout = useMemo(() => layout === "grid-cols-2", [layout]);

  return (
    <section>
      {/* Header Actions */}
      <div className="flex w-full items-center justify-between gap-4 pb-8">
        <SearchInput workspaceslug={workspaceslug} />
        <LinkActions totalLinks={totalLinks} workspaceslug={workspaceslug} />
      </div>

      {/* Loading / Error / Data */}
      {isLoading && links.length === 0 ? (
        <LinkCardSkeleton />
      ) : error ? (
        <div className="p-4 text-red-500">Error loading links.</div>
      ) : links.length > 0 ? (
        <LinkList
          key={`layout-${isGridLayout ? 'grid' : 'list'}`}
          links={linksWithQrCode}
          isGridLayout={isGridLayout}
          isLoading={isLoading}
          isSelectModeOn={isSelectModeOn}
          selectedLinks={selectedLinks}
          onSelect={handleSelectLink}
          isTransitioning={isTransitioning}
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
