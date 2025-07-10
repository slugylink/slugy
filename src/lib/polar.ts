import { Polar } from "@polar-sh/sdk";

export const polarClient = new Polar({
  accessToken: process.env.POLPOLAR_ACCESS_TOKEN!,
  server: "sandbox", // Use "sandbox" for testing, otherwise omit or set to "production"
});
