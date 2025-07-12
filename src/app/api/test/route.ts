import type { NextRequest } from "next/server"
import { userAgent } from "next/server"

export async function GET(request: NextRequest) {
  const { device, browser, os } = userAgent(request)

  return Response.json({
    device: {
      type: device.type || "desktop",
    },
    browser: {
      name: browser.name || "unknown",
      version: browser.version || "unknown",
    },
    os: {
      name: os.name || "unknown",
      version: os.version || "unknown",
    },
  })
}