import { inngest } from "../client";
import { sendEmail } from "@/server/actions/email";
import { templates } from "@/constants/email-templates";

type WelcomeEmailEventData = {
  userId: string;
  email: string;
  name?: string | null;
  workspaceId?: string;
  workspaceName?: string | null;
  workspaceSlug?: string | null;
};

const getAppBaseUrl = () =>
  process.env.NEXT_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_BASE_URL ||
  "http://localhost:3000";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const welcomeEmailFunction = inngest.createFunction(
  {
    id: "workspace-welcome-email",
    triggers: { event: "app/workspace.welcome" },
  },
  async ({ event, step }) => {
    const data = event.data as WelcomeEmailEventData;
    if (!data?.email) {
      throw new Error("Missing welcome-email event payload: email");
    }

    const workspaceName = data.workspaceName?.trim() || "your workspace";
    const dashboardUrl = data.workspaceSlug
      ? `${getAppBaseUrl()}/${data.workspaceSlug}`
      : `${getAppBaseUrl()}/app`;
    const name = data.name || "there";

    const welcomeTemplate = templates["welcome"]({
      name: escapeHtml(name),
      workspaceName: escapeHtml(workspaceName),
      dashboardUrl,
    });

    const text = `Welcome to ${workspaceName} on slugy! You can now start creating short links, track analytics, and explore bio links. Open your workspace at ${dashboardUrl}`;

    return await step.run("send-welcome-email", async () => {
      await sendEmail({
        to: data.email,
        subject: `Welcome to ${workspaceName}`,
        text,
        html: welcomeTemplate,
      });

      return {
        sent: true,
        userId: data.userId,
        workspaceId: data.workspaceId,
      };
    });
  },
);
