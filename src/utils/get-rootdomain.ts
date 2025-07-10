export const getRootDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return "slugy.co";
  }
};
