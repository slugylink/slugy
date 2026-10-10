import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  // Only global unicast IPv6; mapped IPv4 and transition prefixes are excluded.
  return (
    isIP(address) === 6 &&
    /^[23][0-9a-f]{3}:/i.test(address) &&
    !/^200[12]:/i.test(address)
  );
}

/** Pin DNS resolution to the validated address; never follow redirects implicitly. */
export async function checkDestination(
  raw: string,
  redirects = 0,
): Promise<number | null> {
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    return null;
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    return null;
  const pinned = addresses[0];
  const result = await new Promise<{ status: number; location?: string }>(
    (resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          method: "HEAD",
          agent: false,
          family: pinned.family,
          lookup: (_hostname, _options, callback) =>
            callback(null, pinned.address, pinned.family),
          headers: { "User-Agent": "Slugy-Link-Health/1.0" },
        },
        (response) => {
          response.resume();
          resolve({
            status: response.statusCode || 0,
            location: response.headers.location,
          });
        },
      );
      const timeout = setTimeout(
        () => request.destroy(new Error("Destination timeout")),
        8000,
      );
      request.on("close", () => clearTimeout(timeout));
      request.on("error", reject);
      request.end();
    },
  );
  if (
    result.status >= 300 &&
    result.status < 400 &&
    result.location &&
    redirects < 3
  )
    return checkDestination(
      new URL(result.location, url).toString(),
      redirects + 1,
    );
  return result.status;
}
