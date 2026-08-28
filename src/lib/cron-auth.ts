import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export function withCronAuth(handler: () => Promise<NextResponse>) {
  const wrapped = async (req: NextRequest) => {
    if (
      process.env.NODE_ENV === "production" &&
      (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY) {
      return verifySignatureAppRouter(handler)(req);
    }

    return handler();
  };

  return wrapped;
}
