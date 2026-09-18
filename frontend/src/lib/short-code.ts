export const getShortCode = (shortUrl: string): string => {
  try {
    const parsed = new URL(shortUrl);
    return parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  } catch {
    return shortUrl.split("/").pop() ?? shortUrl;
  }
};
