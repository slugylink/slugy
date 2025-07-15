"use client";
import React, { useState, useEffect } from "react";
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

const DraggableLinks = ({
  links: initialLinks,
  username,
  mutate,
}: DraggableLinksProps) => {
  const [links, setLinks] = useState<Link[]>(initialLinks);

  // Sync with parent data
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !result.source) return;

    const items = Array.from(links);
    const [reorderedItem] = items.splice(result.source.index, 1);
    if (reorderedItem) {
      items.splice(result.destination.index, 0, reorderedItem);

      // Update positions
      const updatedItems = items.map((item, index) => ({
        ...item,
        position: index,
      }));

      setLinks(updatedItems);

      try {
        // Update positions in the backend
        await axios.put(`/api/bio-gallery/${username}/link/reorder`, {
          links: updatedItems.map((link) => ({
            id: link.id,
            position: link.position,
          })),
        });
        
        // Optimistically update the SWR cache
        void mutate(
          (currentData: Gallery | undefined) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              links: updatedItems,
            };
          },
          { revalidate: false }
        );
      } catch (error) {
        toast.error("Failed to update link positions");
        console.error("Error updating link positions:", error);
        // Revert to original order if update fails
        setLinks(initialLinks);
        // Revalidate the data
        void mutate();
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="links">
        {(provided: DroppableProvided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="mt-8 space-y-4"
          >
            {links.length === 0 ? (
              <div
                className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded-xl   border"
                aria-label="No links found"
              >
                <Smartphone
                  className="animate-fade-in"
                  size={50}
                  strokeWidth={1.1}
                />
                <h2 className="mt-2 text-lg font-medium">
                  No bio links found
                </h2>
                <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Add a link to get started.
                </p>
              </div>
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
};

export default DraggableLinks;
