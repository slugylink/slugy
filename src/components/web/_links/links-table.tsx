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

// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover"

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
    const params = new URLSearchParams({
      search: searchConfig.search,
      showArchived: searchConfig.showArchived,
      sortBy: searchConfig.sortBy,
      offset: searchConfig.offset.toString(),
      limit: DEFAULT_LIMIT.toString(),
    });
    return `/api/workspace/${workspaceslug}/link/get?${params.toString()}`;
  }, [searchConfig, workspaceslug]);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
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

  const pagination: PaginationData = useMemo(
    () => ({
      total_pages: totalPages,
      limit: DEFAULT_LIMIT,
      total_links: totalLinks,
    }),
    [totalLinks, totalPages],
  );

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
        <SearchInput workspaceslug={workspaceslug} />
        <LinkActions totalLinks={totalLinks} workspaceslug={workspaceslug} />

        {/* <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Dimensions</h4>
            <p className="text-muted-foreground text-sm">
              Set the dimensions for the layer.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                defaultValue="100%"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxWidth">Max. width</Label>
              <Input
                id="maxWidth"
                defaultValue="300px"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                defaultValue="25px"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxHeight">Max. height</Label>
              <Input
                id="maxHeight"
                defaultValue="none"
                className="col-span-2 h-8"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover> */}
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
