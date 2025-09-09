"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import GalleryLinkCard from "./glink-card";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DroppableProvided,
  type DraggableProvided,
} from "@hello-pangea/dnd";
import axios from "axios";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { type KeyedMutator } from "swr";
import { useDebounce } from "@/hooks/use-debounce";

// Constants for better maintainability
const EMPTY_STATE_HEIGHT = "min-h-[60vh]";
const LINKS_CONTAINER_CLASSES = "mt-8 space-y-4";
const EMPTY_STATE_CLASSES = `flex h-full ${EMPTY_STATE_HEIGHT} w-full flex-col items-center justify-center rounded-xl border`;
const DEBOUNCE_DELAY = 1000;

interface Link {
  id: string;
  title: string;
  url: string;
  isPublic: boolean;
  position: number;
  clicks: number;
  galleryId: string;
}

interface Gallery {
  links: Link[];
  username: string;
  name?: string | null;
  bio?: string | null;
  logo?: string | null;
  socials?: {
    platform: string;
    url?: string;
    isPublic?: boolean;
  }[];
  theme?: string;
}

interface DraggableLinksProps {
  links: Link[];
  username: string;
  mutate: KeyedMutator<Gallery>;
}

const EmptyState = React.memo(() => (
  <div
    className={`${EMPTY_STATE_CLASSES} animate-in fade-in slide-in-from-bottom-2 duration-500`}
    aria-label="No links found"
  >
    <Smartphone className="animate-fade-in" size={50} strokeWidth={1.1} />
    <h2 className="mt-2 text-lg font-medium">No bio links found</h2>
    <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
      Add a link to get started.
    </p>
  </div>
));
EmptyState.displayName = "EmptyState";

const DraggableLinks = ({
  links: initialLinks,
  username,
  mutate,
}: DraggableLinksProps) => {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [isReordering, setIsReordering] = useState(false);
  const [pendingReorder, setPendingReorder] = useState<Link[] | null>(null);
  
  // Use refs to prevent multiple API calls
  const isProcessingRef = useRef(false);
  const lastProcessedOrderRef = useRef<string>("");

  // Sync with parent data
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  // Debounce the pending reorder to batch multiple rapid reorder operations
  const debouncedPendingReorder = useDebounce(pendingReorder, DEBOUNCE_DELAY);

  const isEmpty = useMemo(() => links.length === 0, [links.length]);

  // Memoized reorder function for better performance
  const reorderLinks = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      const items = Array.from(links);
      const [reorderedItem] = items.splice(sourceIndex, 1);

      if (reorderedItem) {
        items.splice(destinationIndex, 0, reorderedItem);

        return items.map((item, index) => ({
          ...item,
          position: index,
        }));
      }

      return items;
    },
    [links],
  );

  // Memoized API update function
  const updatePositionsInBackend = useCallback(
    async (updatedItems: Link[]) => {
      try {
        await axios.put(`/api/bio-gallery/${username}/link/reorder`, {
          links: updatedItems.map((link) => ({
            id: link.id,
            position: link.position,
          })),
        });

        return true;
      } catch (error) {
        console.error("Error updating link positions:", error);
        return false;
      }
    },
    [username],
  );

  // Memoized SWR cache update function
  const updateSWRCache = useCallback(
    (updatedItems: Link[]) => {
      return mutate(
        (currentData: Gallery | undefined) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            links: updatedItems,
          };
        },
        { revalidate: false },
      );
    },
    [mutate],
  );

  // Handle the actual backend update when debounced reorder is ready
  useEffect(() => {
    if (debouncedPendingReorder && !isReordering && !isProcessingRef.current) {
      // Create a unique key for this reorder operation to prevent duplicates
      const currentOrderKey = debouncedPendingReorder.map(link => `${link.id}:${link.position}`).join(',');
      
      // Skip if we've already processed this exact order
      if (currentOrderKey === lastProcessedOrderRef.current) {
        return;
      }

      const processReorder = async () => {
        // Set processing flag to prevent multiple simultaneous calls
        isProcessingRef.current = true;
        setIsReordering(true);
        
        try {
          const success = await updatePositionsInBackend(debouncedPendingReorder);
          
          if (success) {
            void updateSWRCache(debouncedPendingReorder);
            toast.success("Link positions updated successfully");
            // Update the last processed order
            lastProcessedOrderRef.current = currentOrderKey;
          } else {
            throw new Error("Failed to update positions");
          }
        } catch (error) {
          console.error("Error updating link positions:", error);
          toast.error("Failed to update link positions");
          setLinks(initialLinks);
          void mutate();
        } finally {
          setIsReordering(false);
          setPendingReorder(null);
          isProcessingRef.current = false;
        }
      };

      void processReorder();
    }
  }, [debouncedPendingReorder, isReordering, updatePositionsInBackend, updateSWRCache, initialLinks, mutate]);

  // Optimized drag end handler with debouncing
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || !result.source) return;

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      // No change in position
      if (sourceIndex === destinationIndex) return;

      // Optimistically update UI immediately for better UX
      const updatedItems = reorderLinks(sourceIndex, destinationIndex);
      setLinks(updatedItems);

      // Set pending reorder for debounced backend update
      setPendingReorder(updatedItems);
    },
    [reorderLinks],
  );

  // Memoized links mapping for better performance
  const renderedLinks = useMemo(
    () =>
      links.map((link, index) => (
        <Draggable key={link.id} draggableId={link.id} index={index}>
          {(provided: DraggableProvided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
              style={{
                animationDelay: `${Math.min(index * 30, 500)}ms`,
                animationFillMode: 'both'
              }}
            >
              <GalleryLinkCard
                link={link}
                username={username}
                mutate={mutate}
              />
            </div>
          )}
        </Draggable>
      )),
    [links, username, mutate],
  );

  // Memoized droppable content
  const droppableContent = useMemo(
    () => (
      <Droppable droppableId="links">
        {(provided: DroppableProvided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={LINKS_CONTAINER_CLASSES}
          >
            {isEmpty ? <EmptyState /> : renderedLinks}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    ),
    [isEmpty, renderedLinks],
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {droppableContent}
    </DragDropContext>
  );
};

export default React.memo(DraggableLinks);
