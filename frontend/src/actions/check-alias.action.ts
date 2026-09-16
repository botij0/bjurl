import { urlApi } from "@/api/url.api";
import type { AliasReason } from "@/lib/alias";

export interface AliasAvailability {
  available: boolean;
  reason: AliasReason | null;
}

export const checkAlias = async (
  alias: string,
  signal?: AbortSignal,
): Promise<AliasAvailability | null> => {
  try {
    const response = await urlApi.get(
      `/alias/${encodeURIComponent(alias)}/available`,
      { signal },
    );

    if (response.status !== 200) return null;

    return response.data;
  } catch {
    return null;
  }
};
