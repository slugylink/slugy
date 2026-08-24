import { inngest } from "../client";

type LinkCreatedEventData = {
  linkId: string;
  domain: string;
  slug: string;
  url: string;
  tagIds: string[];
  workspaceId: string;
  createdAt: string;
};

/**
 * Kept registered so existing Inngest schedules don't 404.
 * Link metadata is written once on create (and healed once on first click).
 * Do not send metadata here — duplicate rows multiply analytics clicks.
 */
export const linkCreatedFunction = inngest.createFunction(
  {
    id: "link-created-side-effects",
    triggers: [{ event: "app/link.created" }],
  },
  async ({ event }) => {
    const data = event.data as LinkCreatedEventData;
    return { ok: true, linkId: data.linkId, skipped: "metadata-on-create" };
  },
);
