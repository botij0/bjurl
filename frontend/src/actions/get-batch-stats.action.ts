import { urlApi } from "@/api/url.api";
import type { LinkSummary } from "@/interfaces/linkStats.interface";

export const getBatchStats = async (shortUrls: string[]): Promise<LinkSummary[]> => {
  if (shortUrls.length === 0) return [];

  try {
    const response = await urlApi.post("/url/batch-stats", { shortUrls });

    if (response.status !== 200) return [];

    return response.data.links ?? [];
  } catch {
    return [];
  }
};
