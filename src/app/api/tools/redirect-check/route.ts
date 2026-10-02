import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  url: z.string().min(1).max(2048),
});

const MAX_HOPS = 10;
const HOP_TIMEOUT_MS = 8000;

interface Hop {
  url: string;
  status: number;
  location: string | null;
}

// Hosts that must never be fetched server-side (SSRF guard). DNS-rebinding
// beyond literal/hostname matching is out of scope for a free utility;
// private-range literals and local names cover the realistic abuse.
function isBlockedHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  )
    return true;
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  )
    return true;
  // IPv4 literals: block loopback, private, link-local, CGNAT, multicast+.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (Number.isNaN(a) || Number.isNaN(b)) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    if (a === 0 || a === 100) return true;
  }
  if (host.includes(":")) return true; // IPv6 literals (incl. bracketed)
  return false;
}

async function fetchHop(
  url: string,
): Promise<{ status: number; location: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOP_TIMEOUT_MS);
  try {
    // Manual redirect handling so every hop is observable. Bodies are
    // never read — status + Location header only.
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "SlugyRedirectChecker/1.0 (+https://slugy.co)" },
    });
    return { status: res.status, location: res.headers.get("location") };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A URL is required" }, { status: 400 });
  }

  let current: URL;
  try {
    const trimmed = parsed.data.url.trim();
    current = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new Error("bad-protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "Enter a valid http(s) URL" },
      { status: 400 },
    );
  }

  const hops: Hop[] = [];
  try {
    for (let i = 0; i < MAX_HOPS; i++) {
      if (isBlockedHost(current.hostname)) {
        return NextResponse.json(
          { error: "That host cannot be checked (private or local address)" },
          { status: 400 },
        );
      }
      const { status, location } = await fetchHop(current.toString());
      const resolved = location ? new URL(location, current).toString() : null;
      hops.push({ url: current.toString(), status, location: resolved });
      if (!resolved || status < 300 || status >= 400) break;
      current = new URL(resolved);
    }
  } catch (error) {
    if (hops.length === 0) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      return NextResponse.json(
        {
          error: timedOut
            ? "Request timed out — the server took too long to respond"
            : "Could not reach that URL",
        },
        { status: 502 },
      );
    }
    // Partial chain is still useful — return what resolved so far.
  }

  return NextResponse.json(
    {
      hops,
      finalUrl: hops[hops.length - 1]?.url ?? current.toString(),
      hopCount: hops.length,
      truncated: hops.length >= MAX_HOPS,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
