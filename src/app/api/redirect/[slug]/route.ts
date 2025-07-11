import { db } from "@/server/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse, userAgent } from "next/server";
import { waitUntil } from "@vercel/functions";

const BOT_REGEX =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Pinterest|vkShare|redditbot|Applebot|WhatsApp|TelegramBot|Discordbot|Slackbot|Viber|Microlink|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|Thunderbird|Outlook-iOS|Outlook-Android|Feedly|Feedspot|Feedbin|NewsBlur|ia_archiver|archive\.org_bot|Uptimebot|Monitis|NewRelicPinger|Postman|insomnia|HeadlessChrome|bot|chatgpt|bluesky|bing|duckduckbot|yandex|baidu|teoma|slurp|MetaInspector|iframely|spider|Go-http-client|preview|prerender|msn/i;

const isBot = (req: NextRequest): boolean => {
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  return BOT_REGEX.test(ua) || (userAgent(req).isBot ?? false);
};

const extractUserAgentData = (req: NextRequest) => {
  const ua = userAgent(req);

  // Use headers passed from middleware if available, otherwise fall back to user agent parsing
  const deviceFromHeader = req.headers.get("x-device-type");
  const browserFromHeader = req.headers.get("x-browser-name");
  const osFromHeader = req.headers.get("x-os-name");
  const isBotFromHeader = req.headers.get("x-is-bot");

  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
    country: req.headers.get("x-vercel-ip-country") ?? undefined,
    city: req.headers.get("x-vercel-ip-city") ?? undefined,
    region: req.headers.get("x-vercel-ip-country-region") ?? undefined,
    continent: req.headers.get("x-vercel-ip-continent") ?? undefined,
    referer: req.headers.get("referer") ?? undefined,
    device: deviceFromHeader || ua.device?.type || "desktop",
    browser: browserFromHeader || ua.browser?.name || "chrome",
    os: osFromHeader || ua.os?.name || "windows",
    isBot: isBotFromHeader === "true" || isBot(req),
  };
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: shortCode } = await params;

    const link = await db.link.findUnique({
      where: {
        slug: shortCode,
        isArchived: false,
      },
      select: {
        id: true,
        url: true,
        expiresAt: true,
        expirationUrl: true,
        password: true,
      },
    });

    if (!link) {
      return NextResponse.json({ url: `${req.nextUrl.origin}/` });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({
        url: link.expirationUrl || `${req.nextUrl.origin}/`,
      });
    }

    if (link.password) {
      const cookieStore = await cookies();
      const passwordVerified = cookieStore.get(
        `password_verified_${shortCode}`,
      );
      if (!passwordVerified) {
        return NextResponse.json({ url: null });
      }
    }

    // Track analytics in background
    const analyticsData = extractUserAgentData(req);

    waitUntil(
      fetch(`${req.nextUrl.origin}/api/analytics/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: link.id,
          slug: shortCode,
          analyticsData,
        }),
      }).catch((error) => {
        console.error("Analytics tracking failed:", error);
      }),
    );

    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Error getting link:", error);
    return NextResponse.json({ url: `${req.nextUrl.origin}/` });
  }
}
