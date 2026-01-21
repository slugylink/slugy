import { Polar } from "@polar-sh/sdk";

let _polarClient: Polar | null = null;

function initPolarClient(): Polar {
  if (!_polarClient) {
    _polarClient = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN || "",
      server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
    });
  }
  return _polarClient;
}

// Lazy-loaded Polar client using Proxy
export const polarClient = new Proxy({} as Polar, {
  get(target, prop) {
    const client = initPolarClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
