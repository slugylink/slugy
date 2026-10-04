import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;
const CRON_SECRET = process.env.CRON_SECRET?.trim();

function hasValidCronSecret(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const auth = req.headers.get("authorization")?.trim();
  return auth === `Bearer ${CRON_SECRET}`;
}

export function withCronAuth(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  const wrapped = async (req: NextRequest) => {
    // Shared secret works in every environment (Vercel Cron / manual curl).
    if (hasValidCronSecret(req)) return handler(req);

    if (QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY) {
      return verifySignatureAppRouter(handler)(req);
    }

    // Fail closed: no valid secret and no QStash signature → 401.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  };

  return wrapped;
}
