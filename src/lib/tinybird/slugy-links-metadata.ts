import { tb } from "@/constants/tinybird";
import { ingestTinybirdEvent } from "@/lib/tinybird/http";

export interface LinkMetadata {
  link_id: string;
  domain: string;
  slug: string;
  url: string;
  tag_ids: string[];
  workspace_id: string;
  created_at: string;
  deleted?: 0 | 1;
  timestamp?: string;
}

interface LinkData {
  id: string;
  domain: string | null;
  slug: string;
  url: string;
  workspaceId: string;
  createdAt: Date;
  tags: { tagId: string }[];
}

export async function sendLinkMetadata(event: LinkMetadata) {
  await ingestTinybirdEvent(tb.links_metadata, {
    ...event,
    deleted: event.deleted ?? 0,
    timestamp: event.timestamp ?? new Date().toISOString(),
  });
}

export async function deleteLink(link: LinkData) {
  try {
    await ingestTinybirdEvent(tb.links_metadata, {
      link_id: link.id,
      domain: link.domain ?? "slugy.co",
      slug: link.slug,
      url: link.url,
      tag_ids: link.tags.map((t) => t.tagId),
      workspace_id: link.workspaceId,
      created_at: link.createdAt.toISOString(),
      deleted: 1,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error marking link as deleted in Tinybird:", error);
  }
}

export async function updateLink(link: LinkData) {
  try {
    await ingestTinybirdEvent(tb.links_metadata, {
      link_id: link.id,
      domain: link.domain ?? "slugy.co",
      slug: link.slug,
      url: link.url,
      tag_ids: link.tags.map((t) => t.tagId),
      workspace_id: link.workspaceId,
      created_at: link.createdAt.toISOString(),
      deleted: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating link in Tinybird:", error);
  }
}
