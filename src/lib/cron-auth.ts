import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;
const CRON_SECRET = process.env.CRON_SECRET?.trim();

function hasValidCronSecret(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const auth = req.headers.get("authorization")?.trim();
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  // Vercel Cron can pass the secret as ?secret= when headers can't be set.
  try {
    const secret = new URL(req.url).searchParams.get("secret")?.trim();
    return secret === CRON_SECRET;
  } catch {
    return false;
  }
}

export function withCronAuth(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  const wrapped = async (req: NextRequest) => {
    // Shared secret works in every environment (Vercel Cron / manual curl).
    if (hasValidCronSecret(req)) return handler(req);

    if (
      process.env.NODE_ENV === "production" &&
      (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY) {
      return verifySignatureAppRouter(handler)(req);
    }

    return handler(req);
  };

  return wrapped;
}
