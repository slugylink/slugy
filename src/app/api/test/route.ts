import { headers } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const headersList = await headers();

  const deviceType = headersList.get("x-device-type") || "unknown";
  const browserName = headersList.get("x-browser-name") || "unknown";
  const osName = headersList.get("x-os-name") || "unknown";

  return Response.json({
    device: {
      type: deviceType || "unknown",
    },
    browser: {
      name: browserName || "unknown",
    },
    os: {
      name: osName || "unknown",
    },
  });
}
