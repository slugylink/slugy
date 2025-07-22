"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Link } from "lucide-react";
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
  qrCode: {
    id: string;
    customization?: string;
  };
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

  useEffect(() => {
    setworkspaceslug(workspaceslug);
  }, [workspaceslug, setworkspaceslug]);

  const searchConfig = useMemo(
    () => ({
      search: searchParams?.get("search") ?? "",
      showArchived: searchParams?.get("showArchived") ?? "false",
      sortBy: searchParams?.get("sortBy") ?? "date-created",
      offset: (Number(searchParams?.get("page_no") ?? "1") - 1) * DEFAULT_LIMIT,
    }),
    [searchParams],
  );
  // Memoized API URL
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
  // SWR hook
  const { data, isLoading } = useSWR<ApiResponse, Error & { status?: number }>(
    apiUrl,
  );

  const { links, totalLinks, totalPages } = data ?? {
    links: [],
    totalLinks: 0,
    totalPages: 0,
  };

  // Ensure all links have a qrCode property for LinkList/LinkCard compatibility
  const linksWithQrCode = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        qrCode: link.qrCode || { id: "", customization: "" },
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

  const memoizedPagination = useMemo(
    () => ({
      total_pages: totalPages,
      limit: DEFAULT_LIMIT,
      total_links: totalLinks,
    }),
    [totalPages, totalLinks],
  );

  const { layout, setLayout } = useLayoutPreference();
  const { isProcessing, executeOperation } = useBulkOperation(workspaceslug);

  const handleArchive = useCallback(
    (linkIds: string[]) => {
      executeOperation("archive", linkIds);
    },
    [executeOperation],
  );

  const handleDelete = useCallback(
    (linkIds: string[]) => {
      executeOperation("delete", linkIds);
    },
    [executeOperation],
  );

  const isGridLayout = layout === "grid-cols-2";
  return (
    <section>
      <div className="flex w-full items-center justify-between gap-4 pb-8">
        <SearchInput workspaceslug={workspaceslug} setLayout={setLayout} />
        <LinkActions totalLinks={10} workspaceslug={workspaceslug} />
      </div>

      {isLoading && links.length === 0 ? (
        <LinkCardSkeleton />
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
        pagination={memoizedPagination}
        selectedLinks={selectedLinks}
      />
    </section>
  );
};

export default LinksTable;
