"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { useWorkspaceStore } from "@/store/workspace";
import {
  DEFAULT_LIMIT,
  LAYOUT_OPTIONS,
  type LayoutOption,
} from "@/constants/links";
import type {
  Link,
  ApiResponse,
  SearchConfig,
  PaginationData,
} from "@/types/link-types";

import SearchInput from "./search-input";
import LinkActions from "./link-actions";
import LinkPagination from "./link-pagination";
import {
  EmptyState,
  LinkCardSkeleton,
  LinkList,
  ErrorState,
} from "./table-links-components";
import { useBulkOperation, useLayoutPreference } from "./table-links-hooks";

const SWR_DEDUPING_INTERVAL = 3000;
const DEFAULT_SORT = "date-created";
const DEFAULT_PAGE = 1;

interface LinksTableProps {
  workspaceslug: string;
  fallbackData?: ApiResponse | null;
}

const buildSearchConfig = (
  searchParams: URLSearchParams | null,
): SearchConfig => {
  const page = Number(searchParams?.get("page_no") ?? DEFAULT_PAGE);
  const tagIds = [
    ...new Set(
      (searchParams?.get("tag") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  return {
    search: searchParams?.get("search") ?? "",
    showArchived: searchParams?.get("showArchived") ?? "false",
    sortBy: searchParams?.get("sortBy") ?? DEFAULT_SORT,
    offset: Math.max(0, (page - 1) * DEFAULT_LIMIT),
    tagIds,
  };
};

const buildApiUrl = (workspaceslug: string, config: SearchConfig): string => {
  const params = new URLSearchParams();

  if (config.search) params.set("search", config.search);
  if (config.showArchived === "true") params.set("showArchived", "true");
  if (config.sortBy !== DEFAULT_SORT) params.set("sortBy", config.sortBy);
  if (config.offset > 0) params.set("offset", config.offset.toString());
  if (config.tagIds.length > 0) params.set("tag", config.tagIds.join(","));

  const queryString = params.toString();
  return `/api/workspace/${workspaceslug}/link/get${queryString ? `?${queryString}` : ""}`;
};

const normalizeLinks = (links: Link[]): Link[] =>
  links.map((link) => ({
    ...link,
    qrCode: link.qrCode ?? { id: "", customization: "" },
  }));

const LinksTable = ({ workspaceslug, fallbackData }: LinksTableProps) => {
  const searchParams = useSearchParams();
  const { setworkspaceslug } = useWorkspaceStore();

  const [isSelectModeOn, setIsSelectModeOn] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    if (workspaceslug) {
      setworkspaceslug(workspaceslug);
    }
  }, [workspaceslug, setworkspaceslug]);

  const searchConfig = useMemo(
    () => buildSearchConfig(searchParams),
    [searchParams],
  );

  const apiUrl = useMemo(
    () => buildApiUrl(workspaceslug, searchConfig),
    [searchConfig, workspaceslug],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiResponse>(
    apiUrl,
    fetcher,
    {
      dedupingInterval: SWR_DEDUPING_INTERVAL,
      revalidateOnFocus: false,
      keepPreviousData: true,
      // Server prefetch matches current URL searchParams on first paint
      fallbackData: fallbackData ?? undefined,
    },
  );

  const { links = [], totalLinks = 0, totalPages = 0 } = data ?? {};
  const linksWithQrCode = useMemo(() => normalizeLinks(links), [links]);

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

  const { layout, setLayout } = useLayoutPreference();
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

  const pagination: PaginationData = {
    total_pages: totalPages,
    limit: DEFAULT_LIMIT,
    total_links: totalLinks,
  };

  const isGridLayout = layout === "grid-cols-2";
  const showInitialSkeleton = isLoading && !data && links.length === 0;

  return (
    <section>
      <div className="flex w-full items-center justify-between gap-4 pb-8">
        <SearchInput />
        <LinkActions totalLinks={totalLinks} workspaceslug={workspaceslug} />
      </div>

      {showInitialSkeleton ? (
        <LinkCardSkeleton />
      ) : error && !data ? (
        <ErrorState error={error as Error} onRetry={() => mutate()} />
      ) : links.length > 0 ? (
        <div
          className={
            isValidating && isLoading
              ? "opacity-70 transition-opacity"
              : undefined
          }
        >
          <LinkList
            key={`layout-${isGridLayout ? "grid" : "list"}`}
            links={linksWithQrCode}
            isGridLayout={isGridLayout}
            isLoading={isLoading}
            isSelectModeOn={isSelectModeOn}
            selectedLinks={selectedLinks}
            onSelect={handleSelectLink}
          />
        </div>
      ) : (
        <EmptyState
          searchQuery={searchConfig.search}
          hasTagFilter={searchConfig.tagIds.length > 0}
        />
      )}

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
