import { inngest } from "../client";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";

type LinkCreatedEventData = {
  linkId: string;
  domain: string;
  slug: string;
  url: string;
  tagIds: string[];
  workspaceId: string;
  createdAt: string;
};

export const linkCreatedFunction = inngest.createFunction(
  {
    id: "link-created-side-effects",
    triggers: [{ event: "app/link.created" }],
  },
  async ({ event, step }) => {
    const data = event.data as LinkCreatedEventData;

    await step.run("invalidate-link-cache", async () => {
      await invalidateLinkCache(data.slug, data.domain);
    });

    await step.run("send-link-metadata", async () => {
      await sendLinkMetadata({
        link_id: data.linkId,
        domain: data.domain,
        slug: data.slug,
        url: data.url,
        tag_ids: data.tagIds,
        workspace_id: data.workspaceId,
        created_at: data.createdAt,
      });
    });

    return { ok: true, linkId: data.linkId };
  },
);
