import { urlApi } from "@/api/url.api";
import type { LinkStats } from "@/interfaces/linkStats.interface";

export const getLinkStats = async (shortUrl: string): Promise<LinkStats | null> => {
  try {
    const response = await urlApi.get(
      `/url/${encodeURIComponent(shortUrl)}/stats`,
    );

    if (response.status !== 200) return null;

    return response.data;
  } catch {
    return null;
  }
};
