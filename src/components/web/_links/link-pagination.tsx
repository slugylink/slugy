"use client"

import React, { memo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useQueryState, parseAsString } from "nuqs"
import { Archive, Trash2, X, Loader2 } from "lucide-react"
import { BulkOperationDialog } from "./table-links-components"

interface PaginationProps {
  total_pages: number
  limit: number
  total_links: number
}

interface PaginationComponentProps {
  isSelectModeOn: boolean
  setIsSelectModeOn: React.Dispatch<React.SetStateAction<boolean>>
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onArchive: (linkIds: string[]) => void
  onDelete: (linkIds: string[]) => void
  isProcessing: boolean
  pagination: PaginationProps
  selectedLinks: Set<string>
}

// Memoized SelectionMode component (Back side)
const SelectionMode = memo(
  ({
    selectedCount,
    onClearSelection,
    onArchiveClick,
    onDeleteClick,
    isProcessing,
  }: {
    selectedCount: number
    onClearSelection: () => void
    onArchiveClick: () => void
    onDeleteClick: () => void
    isProcessing: boolean
  }) => (
    <div className="absolute inset-0 w-full h-full backface-hidden rotate-x-180">
      <div className="flex w-full items-center justify-between rounded-xl border bg-white p-3.5 shadow-lg md:px-4 dark:bg-black h-full">
        <div className="flex items-center gap-2 text-sm font-normal text-zinc-700 dark:text-zinc-50">
          <Button variant="ghost" size="icon" onClick={onClearSelection} className="size-6" disabled={isProcessing}>
            <X className="h-4 w-4" />
          </Button>
          <span>{selectedCount} selected</span>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onArchiveClick}
            className="h-fit py-1 text-sm font-normal bg-transparent"
            disabled={selectedCount === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Archive className="mr-1 h-3 w-3" />}
            Archive
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteClick}
            className="h-fit py-1 text-sm font-normal bg-transparent"
            disabled={selectedCount === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
            Delete
          </Button>
        </div>
      </div>
    </div>
  ),
)

SelectionMode.displayName = "SelectionMode"

// Memoized NavigationMode component (Front side)
const NavigationMode = memo(
  ({
    currentPage,
    pagination,
    handlePageChange,
    setIsSelectModeOn,
  }: {
    currentPage: number
    pagination: PaginationProps
    handlePageChange: (page: number) => void
    setIsSelectModeOn: React.Dispatch<React.SetStateAction<boolean>>
  }) => (
    <div className="absolute inset-0 w-full h-full backface-hidden">
      <div className="flex w-full items-center justify-between rounded-xl border bg-white p-3.5 shadow-lg md:px-4 dark:bg-black h-full">
        <p className="text-sm font-normal text-zinc-700 dark:text-zinc-50">
          {pagination.total_links === 0
            ? "0-0"
            : `${(currentPage - 1) * pagination.limit + 1}-${Math.min(
                currentPage * pagination.limit,
                pagination.total_links,
              )}`}{" "}
          of {pagination.total_links} links
        </p>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSelectModeOn(true)}
            className="h-fit py-1 font-normal"
          >
            Select
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-fit py-1 font-normal"
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-fit py-1 font-normal bg-transparent"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={pagination.total_links === 0 || currentPage === pagination.total_pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  ),
)

NavigationMode.displayName = "NavigationMode"

export default function LinkPagination({
  isSelectModeOn,
  setIsSelectModeOn,
  selectedCount,
  onClearSelection,
  onArchive,
  onDelete,
  isProcessing,
  pagination,
  selectedLinks,
}: PaginationComponentProps): React.JSX.Element {
  const [pageNo, setPageNo] = useQueryState("page_no", parseAsString)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState<"archive" | "delete" | null>(null)

  // Get current page from URL, default to 1
  const currentPage = Number(pageNo ?? 1)

  // Handle flip animation when mode changes
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isSelectModeOn])

  // Handling pagination actions
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      if (newPage > 1) {
        void setPageNo(newPage.toString())
      } else {
        void setPageNo(null) // Remove param for page 1
      }
    },
    [setPageNo],
  )

  // Enhanced clear selection with flip animation
  const handleClearSelection = React.useCallback(() => {
    onClearSelection()
    setIsSelectModeOn(false)
  }, [onClearSelection, setIsSelectModeOn])

  // Confirmation dialog handlers
  const handleArchiveConfirm = React.useCallback(() => {
    if (selectedLinks.size > 0) {
      onArchive(Array.from(selectedLinks))
      setShowConfirmation(null)
      setIsSelectModeOn(false)
    }
  }, [onArchive, selectedLinks, setIsSelectModeOn])

  const handleDeleteConfirm = React.useCallback(() => {
    if (selectedLinks.size > 0) {
      onDelete(Array.from(selectedLinks))
      setShowConfirmation(null)
    }
  }, [onDelete, selectedLinks, setIsSelectModeOn])

  const handleArchiveClick = React.useCallback(() => {
    setShowConfirmation("archive")
  }, [])

  const handleDeleteClick = React.useCallback(() => {
    setShowConfirmation("delete")
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:-translate-x-1/3 lg:max-w-2xl w-full">
      <div className="perspective-1000 px-4">
        <div
          className={`flip-container relative h-16 w-full transform-style-preserve-3d transition-transform duration-500 ease-spring ${
            isSelectModeOn ? "rotate-x-180" : ""
          } ${isAnimating ? "flipping" : ""}`}
        >
          {/* Navigation Mode - Front Side (default) */}
          <NavigationMode
            currentPage={currentPage}
            pagination={pagination}
            handlePageChange={handlePageChange}
            setIsSelectModeOn={setIsSelectModeOn}
          />

          {/* Selection Mode - Back Side */}
          <SelectionMode
            selectedCount={selectedCount}
            onClearSelection={handleClearSelection}
            onArchiveClick={handleArchiveClick}
            onDeleteClick={handleDeleteClick}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <BulkOperationDialog
        isOpen={showConfirmation !== null}
        onClose={() => setShowConfirmation(null)}
        operation={showConfirmation}
        selectedCount={selectedCount}
        onConfirm={showConfirmation === "archive" ? handleArchiveConfirm : handleDeleteConfirm}
        isProcessing={isProcessing}
      />
    </div>
  )
}

LinkPagination.displayName = "LinkPagination"
