import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { apiErrors } from "@/lib/api-response";
import { jsonWithETag } from "@/lib/http";
import { getClientIp } from "@/lib/middleware/client-ip";

const createLinkSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "Only HTTP and HTTPS URLs are allowed",
    ),
});

interface LinkData {
  url: string;
  code: string;
  ip: string;
  ownerId: string;
  createdAt: string;
  expiresAt: string;
  clicks?: number;
}

const LINK_EXPIRY_SECONDS = 15 * 60;
const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-slugy-temp" : "slugy-temp";
const createCode = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  6,
);

// Check all limits and collisions before writing. Redis executes Lua atomically.
// The legacy IP set is checked only for throttling during the 15-minute migration.
const CREATE_TEMP_LINK = `
if redis.call('EXISTS', KEYS[1]) == 1 or redis.call('EXISTS', KEYS[2]) == 1 or redis.call('SCARD', KEYS[4]) > 0 then
  return 0
end
if redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
redis.call('SET', KEYS[3], ARGV[2], 'EX', ARGV[3])
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
return 1
`;

async function browserSession() {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  const token =
    existing && /^[a-f0-9]{64}$/.test(existing)
      ? existing
      : randomBytes(32).toString("hex");
  return {
    token,
    isNew: token !== existing,
    ownerId: createHash("sha256").update(token).digest("hex"),
  };
}

function attachSession(
  response: ReturnType<typeof jsonWithETag>,
  session: Awaited<ReturnType<typeof browserSession>>,
) {
  if (session.isNew) {
    response.cookies.set(COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

const publicLink = (data: LinkData) => ({
  short: `slugy.co/${data.code}&c`,
  original: data.url,
  clicks: data.clicks || 0,
  expires: data.expiresAt,
});

export async function GET(req: Request) {
  try {
    const session = await browserSession();
    // Never fall back to an IP-based lookup, including for legacy links.
    const code = session.isNew
      ? null
      : await redis.get<string>(`temp:owner:${session.ownerId}`);
    const raw = code
      ? await redis.get<LinkData | string>(`temp:link:${code}`)
      : null;
    const data: LinkData | null =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    const links =
      data &&
      data.ownerId === session.ownerId &&
      Date.parse(data.expiresAt) > Date.now()
        ? [publicLink(data)]
        : [];
    return attachSession(
      jsonWithETag(req, { success: true, data: { links } }),
      session,
    );
  } catch {
    return apiErrors.serviceUnavailable(
      "Temporary links are temporarily unavailable",
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiErrors.badRequest("Invalid JSON body");
  }
  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success)
    return apiErrors.validationError(
      parsed.error.errors,
      "Invalid destination URL",
    );

  try {
    const session = await browserSession();
    const ip = getClientIp(await headers());
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = createCode();
      const now = new Date();
      const data: LinkData = {
        url: parsed.data.url,
        code,
        ip,
        ownerId: session.ownerId,
        createdAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + LINK_EXPIRY_SECONDS * 1000,
        ).toISOString(),
        clicks: 0,
      };
      const result = await redis.eval(
        CREATE_TEMP_LINK,
        [
          `temp:limit:ip:${ip}`,
          `temp:owner:${session.ownerId}`,
          `temp:link:${code}`,
          `temp:ip:${ip}`,
        ],
        [code, JSON.stringify(data), LINK_EXPIRY_SECONDS],
      );
      if (result === 0) return apiErrors.rateLimitExceeded();
      if (result === -1) continue;
      if (result !== 1) throw new Error("Unexpected reservation result");
      return attachSession(
        jsonWithETag(null, { success: true, data: publicLink(data) }, 201),
        session,
      );
    }
    return apiErrors.serviceUnavailable(
      "Could not create a temporary link. Please try again.",
    );
  } catch {
    return apiErrors.serviceUnavailable(
      "Temporary links are temporarily unavailable",
    );
  }
}
