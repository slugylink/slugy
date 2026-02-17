"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DroppableProvided,
  type DraggableProvided,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { type KeyedMutator } from "swr";
import axios from "axios";
import GalleryLinkCard from "./glink-card";
import { useDebounce } from "@/hooks/use-debounce";
import type { EditorBioLink, EditorGallery } from "@/types/bio-links";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_DELAY = 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DraggableLinksProps {
  links: EditorBioLink[];
  username: string;
  mutate: KeyedMutator<EditorGallery>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reorderLinks(
  links: EditorBioLink[],
  sourceIndex: number,
  destinationIndex: number,
): EditorBioLink[] {
  const items = [...links];
  const [moved] = items.splice(sourceIndex, 1);
  if (!moved) return items;

  items.splice(destinationIndex, 0, moved);
  return items.map((item, index) => ({ ...item, position: index }));
}

function orderKey(links: EditorBioLink[]): string {
  return links.map((l) => `${l.id}:${l.position}`).join(",");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex w-full flex-col items-center justify-center"
      aria-live="polite"
    >
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        Add a link to get started.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DraggableLinks({
  links: initialLinks,
  username,
  mutate,
}: DraggableLinksProps) {
  const [links, setLinks] = useState<EditorBioLink[]>(initialLinks);
  const [pendingReorder, setPendingReorder] = useState<EditorBioLink[] | null>(
    null,
  );

  const isProcessingRef = useRef(false);
  const lastOrderKeyRef = useRef<string>("");

  // Keep local state in sync when parent data changes
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const debouncedPendingReorder = useDebounce(pendingReorder, DEBOUNCE_DELAY);

  // ── Reorder API call ──
  const updatePositions = useCallback(
    async (updatedLinks: EditorBioLink[]): Promise<boolean> => {
      try {
        await axios.put(`/api/bio-gallery/${username}/link/reorder`, {
          links: updatedLinks.map(({ id, position }) => ({ id, position })),
        });
        return true;
      } catch (err) {
        console.error("[DraggableLinks] Reorder API error:", err);
        return false;
      }
    },
    [username],
  );

  // ── SWR optimistic update ──
  const updateCache = useCallback(
    (updatedLinks: EditorBioLink[]) =>
      mutate(
        (current) => (current ? { ...current, links: updatedLinks } : current),
        { revalidate: false },
      ),
    [mutate],
  );

  // ── Flush debounced reorder to backend ──
  useEffect(() => {
    if (!debouncedPendingReorder || isProcessingRef.current) return;

    const key = orderKey(debouncedPendingReorder);
    if (key === lastOrderKeyRef.current) return;

    const flush = async () => {
      isProcessingRef.current = true;

      try {
        const ok = await updatePositions(debouncedPendingReorder);

        if (ok) {
          void updateCache(debouncedPendingReorder);
          lastOrderKeyRef.current = key;
          toast.success("Link positions updated");
        } else {
          throw new Error("Reorder failed");
        }
      } catch {
        toast.error("Failed to update link positions");
        setLinks(initialLinks);
        void mutate();
      } finally {
        isProcessingRef.current = false;
        setPendingReorder(null);
      }
    };

    void flush();
  }, [
    debouncedPendingReorder,
    updatePositions,
    updateCache,
    initialLinks,
    mutate,
  ]);

  // ── Drag handler ──
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;

      const updated = reorderLinks(links, source.index, destination.index);
      setLinks(updated);
      setPendingReorder(updated);
    },
    [links],
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="links">
        {(provided: DroppableProvided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-4 pt-2"
          >
            {links.length === 0 ? (
              <EmptyState />
            ) : (
              links.map((link, index) => (
                <Draggable key={link.id} draggableId={link.id} index={index}>
                  {(provided: DraggableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <GalleryLinkCard
                        link={link}
                        username={username}
                        mutate={mutate}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
