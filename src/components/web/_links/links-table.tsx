"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import SearchInput from "./search-input";
import LinkActions from "./link-actions";
import LinkPagination from "./link-pagination";
import { DEFAULT_LIMIT } from "@/constants/links";
import {
  EmptyState,
  LinkCardSkeleton,
  LinkList,
} from "./table-links-components";
import { useBulkOperation, useLayoutPreference } from "./table-links-hooks";
import { useWorkspaceStore } from "@/store/workspace";
import { fetcher } from "@/lib/fetcher";

interface Link {
  id: string;
  url: string;
  slug: string;
  clicks: number;
  description?: string | null;
  expiresAt?: Date | null;
  isArchived?: boolean;
  isPublic: boolean;
  creator: { name: string | null; image: string | null } | null;
  qrCode?: {
    id: string;
    customization?: string;
  } | null;
}

interface ApiResponse {
  links: Link[];
  totalLinks: number;
  totalPages: number;
}

const LinksTable = ({ workspaceslug }: { workspaceslug: string }) => {
  const searchParams = useSearchParams();
  const { setworkspaceslug } = useWorkspaceStore();
  const [isSelectModeOn, setIsSelectModeOn] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  // Sync workspace slug with store
  useEffect(() => {
    setworkspaceslug(workspaceslug);
  }, [workspaceslug, setworkspaceslug]);

  // Build search config from URL params
  const searchConfig = useMemo(() => {
    const page = Number(searchParams?.get("page_no") ?? "1");
    return {
      search: searchParams?.get("search") ?? "",
      showArchived: searchParams?.get("showArchived") ?? "false",
      sortBy: searchParams?.get("sortBy") ?? "date-created",
      offset: (page - 1) * DEFAULT_LIMIT,
    };
  }, [searchParams]);

  // API URL for SWR
  const apiUrl = useMemo(
    () =>
      `/api/workspace/${workspaceslug}/link/get?${new URLSearchParams({
        search: searchConfig.search,
        showArchived: searchConfig.showArchived,
        sortBy: searchConfig.sortBy,
        offset: searchConfig.offset.toString(),
        limit: DEFAULT_LIMIT.toString(),
      }).toString()}`,
    [workspaceslug, searchConfig],
  );

  // Fetch data
  const { data, error, isLoading } = useSWR<ApiResponse>(apiUrl, fetcher);

  const { links = [], totalLinks = 0, totalPages = 0 } = data ?? {};

  // Ensure QR codes
  const linksWithQrCode = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        qrCode: link.qrCode ?? { id: "", customization: "" },
      })),
    [links],
  );

  // Selection handlers
  const handleSelectLink = useCallback((linkId: string) => {
    setSelectedLinks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedLinks(
      selectedLinks.size === links.length
        ? new Set()
        : new Set(links.map((l) => l.id)),
    );
  }, [links, selectedLinks.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedLinks(new Set());
    setIsSelectModeOn(false);
  }, []);

  // Pagination memoized
  const pagination = useMemo(
    () => ({
      total_pages: totalPages,
      limit: DEFAULT_LIMIT,
      total_links: totalLinks,
    }),
    [totalPages, totalLinks],
  );

  // Layout & bulk actions
  const { layout, setLayout } = useLayoutPreference();
  const { isProcessing, executeOperation } = useBulkOperation(workspaceslug);

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
        <SearchInput workspaceslug={workspaceslug} setLayout={setLayout} />
        <LinkActions totalLinks={totalLinks} workspaceslug={workspaceslug} />
      </div>

      {/* Loading / Error / Data */}
      {isLoading && links.length === 0 ? (
        <LinkCardSkeleton />
      ) : error ? (
        <div className="p-4 text-red-500">Error loading links.</div>
      ) : links.length > 0 ? (
        <LinkList
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
