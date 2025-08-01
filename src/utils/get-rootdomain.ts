export const getRootDomain = (url: string): string => {
  try {
    // If URL doesn't have a protocol, prepend https://
    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
    const hostname = new URL(normalizedUrl).hostname;
    const parts = hostname.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return "slugy.co";
  }
};
