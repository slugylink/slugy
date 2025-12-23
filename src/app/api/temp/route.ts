import { customAlphabet } from "nanoid";
import { headers } from "next/headers";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { apiSuccess, apiErrors } from "@/lib/api-response";

// Schema validation
const createLinkSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

// Type definitions
interface LinkResponse {
  short: string;
  original: string;
  clicks: number;
  expires: string;
}

interface LinkData {
  url: string;
  code: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
  clicks?: number;
}

// Constants
const LINK_EXPIRY_SECONDS = 15 * 60; // 20 minutes
const MAX_LINKS_PER_IP = 1;
const CODE_LENGTH = 6;

// Utility functions
const getClientIP = (headersList: Headers): string => {
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  return ip === "::1" || ip === "127.0.0.1" ? "localhost" : ip;
};

const createLinkResponse = (data: LinkData): LinkResponse => ({
  short: `slugy.co/${data.code}&c`,
  original: data.url,
  clicks: data.clicks || 0,
  expires: data.expiresAt,
});

const isLinkExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) <= new Date();
};

export async function GET() {
  try {
    const headersList = await headers();
    const normalizedIp = getClientIP(headersList);
    const ipKey = `temp:ip:${normalizedIp}`;

    // Get all link codes for this IP
    const linkCodes = await redis.smembers(ipKey);

    if (!linkCodes.length) {
      return Response.json(apiSuccess({ links: [] }));
    }

    // Fetch all link data in parallel
    const linkPromises = linkCodes.map(async (code) => {
      const linkKey = `temp:link:${code}`;
      const linkData = await redis.get(linkKey);

      if (!linkData) return null;

      try {
        const data =
          typeof linkData === "string"
            ? (JSON.parse(linkData) as LinkData)
            : (linkData as LinkData);

        // Check if link is expired
        if (isLinkExpired(data.expiresAt)) {
          // Clean up expired link
          await Promise.all([redis.del(linkKey), redis.srem(ipKey, code)]);
          return null;
        }

        return createLinkResponse(data);
      } catch (error) {
        console.error(`Error parsing link data for code ${code}:`, error);
        return null;
      }
    });

    const links = await Promise.all(linkPromises);
    const validLinks = links.filter(
      (link): link is LinkResponse => link !== null,
    );

    return Response.json(apiSuccess({ links: validLinks }));
  } catch (error) {
    console.error("GET /api/temp error:", error);
    return Response.json(apiErrors.internalError("Failed to fetch temporary links"));
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const normalizedIp = getClientIP(headersList);
    const ipKey = `temp:ip:${normalizedIp}`;

    // Parse and validate request body
    const body = await req.json();
    const { url } = createLinkSchema.parse(body);

    // Check rate limit
    const existingLinks = await redis.smembers(ipKey);
    if (existingLinks.length >= MAX_LINKS_PER_IP) {
      return Response.json(
        apiErrors.rateLimitExceeded(),
      );
    }

    const nanoid = customAlphabet(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      6,
    );
    // Generate unique code
    const code = nanoid(CODE_LENGTH);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LINK_EXPIRY_SECONDS * 1000);

    // Prepare link data
    const linkData: LinkData = {
      url,
      code,
      ip: normalizedIp,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      clicks: 0,
    };

    const linkKey = `temp:link:${code}`;

    // Store data atomically using pipeline
    const pipeline = redis.pipeline();
    pipeline.setex(linkKey, LINK_EXPIRY_SECONDS, JSON.stringify(linkData));
    pipeline.sadd(ipKey, code);
    pipeline.expire(ipKey, LINK_EXPIRY_SECONDS);

    await pipeline.exec();

    const response = createLinkResponse(linkData);
    return Response.json(apiSuccess(response));
  } catch (error) {
    console.error("POST /api/temp error:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        apiErrors.validationError(error.errors, error.errors[0]?.message || "Invalid request data"),
      );
    }

    return Response.json(
      apiErrors.internalError("Failed to create temporary link"),
    );
  }
}
