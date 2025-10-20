import { tb } from "@/constants/tinybird";

const API_BASE = "https://api.us-east.aws.tinybird.co/v0";
const TINYBIRD_API_KEY = process.env.TINYBIRD_API_KEY!;

export interface LinkMetadata {
  link_id: string;
  domain: string;
  slug: string;
  url: string;
  tag_ids: string[];
  workspace_id: string;
  created_at: string; // ISO string
  deleted?: 0 | 1;
  timestamp?: string; // ISO string
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
  const payload = {
    ...event,
    deleted: 0,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  const res = await fetch(
    `${API_BASE}/events?name=${tb.links_metadata}&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Tinybird links_metadata send error:", res.status, text);
  }
}

export async function deleteLink(link: LinkData) {
  try {
    const payload = {
      link_id: link.id,
      domain: link.domain ?? "slugy.co",
      slug: link.slug,
      url: link.url,
      tag_ids: link.tags.map((t) => t.tagId),
      workspace_id: link.workspaceId,
      created_at: link.createdAt.toISOString(),
      deleted: 1,
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(
      `${API_BASE}/datasources?mode=append&name=${tb.links_metadata}&format=ndjson`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TINYBIRD_API_KEY}`,
          "Content-Type": "application/x-ndjson",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Tinybird delete link error:", res.status, text);
    }
  } catch (error) {
    console.error("Error marking link as deleted in Tinybird:", error);
  }
}

export async function updateLink(link: LinkData) {
  try {
    const payload = {
      link_id: link.id,
      domain: link.domain ?? "slugy.co",
      slug: link.slug,
      url: link.url,
      tag_ids: link.tags.map((t) => t.tagId),
      workspace_id: link.workspaceId,
      created_at: link.createdAt.toISOString(),
      deleted: 0, // mark as active/not deleted
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(
      `${API_BASE}/datasources?mode=append&name=${tb.links_metadata}&format=ndjson`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TINYBIRD_API_KEY}`,
          "Content-Type": "application/x-ndjson",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Tinybird update link error:", res.status, text);
    }
  } catch (error) {
    console.error("Error updating link in Tinybird:", error);
  }
}
