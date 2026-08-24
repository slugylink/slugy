import { inngest } from "../client";
import { sendEmail } from "@/server/actions/email";
import { templates } from "@/constants/email-templates";

type WelcomeEmailEventData = {
  userId: string;
  email: string;
  name?: string | null;
};

const getAppBaseUrl = () =>
  process.env.NEXT_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_BASE_URL ||
  "http://localhost:3000";

export const welcomeEmailFunction = inngest.createFunction(
  {
    id: "user-welcome-email",
    triggers: { event: "app/user.welcome" },
  },
  async ({ event, step }) => {
    const data = event.data as WelcomeEmailEventData;
    if (!data?.email) {
      throw new Error("Missing welcome-email event payload: email");
    }

    const dashboardUrl = `${getAppBaseUrl()}/login`;
    const name = data.name || "there";

    const welcomeTemplate = templates["welcome"]({
      name,
      dashboardUrl,
    });

    const text = `Welcome to slugy! You can now start creating short links, track analytics, and explore bio links. Visit your dashboard at ${dashboardUrl}`;

    return await step.run("send-welcome-email", async () => {
      await sendEmail({
        to: data.email,
        subject: "Welcome to slugy!",
        text,
        html: welcomeTemplate,
      });

      return { sent: true, userId: data.userId };
    });
  },
);
