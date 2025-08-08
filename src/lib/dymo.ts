import DymoAPI from "dymo-api";

export const dymo = new DymoAPI({
  apiKey: process.env.DYMO_API_KEY!,
});
