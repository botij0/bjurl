import axios, { type AxiosInstance } from "axios";

import type { CreateUrlOptions } from "@/interfaces/createUrlOptions.interface";
import type { LinkStats, LinkSummary } from "@/interfaces/linkStats.interface";
import type { Stats } from "@/interfaces/stats.interface";
import type { urlResponse } from "@/interfaces/urlResponse.interface";
import type { AliasReason } from "@/lib/alias";

export type UrlOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "not_found" | "error" };

export type CreateOutcome =
  | { ok: true; data: urlResponse }
  | { ok: false; kind: "refused"; reason: AliasReason }
  | { ok: false; kind: "error"; error: string };

export interface AliasAvailability {
  available: boolean;
  reason: AliasReason | null;
}

const GENERIC_ERROR = "Something went wrong, please try again";

const isStatus = (error: unknown, status: number): boolean =>
  axios.isAxiosError(error) && error.response?.status === status;

const bodyOf = (
  error: unknown,
): { error?: string; reason?: AliasReason } | undefined =>
  axios.isAxiosError(error)
    ? (error.response?.data as { error?: string; reason?: AliasReason } | undefined)
    : undefined;

export const createUrlClient = (client: AxiosInstance) => {
  const outcome = async <T>(
    run: () => Promise<{ data: T }>,
  ): Promise<UrlOutcome<T>> => {
    try {
      const response = await run();
      return { ok: true, data: response.data };
    } catch (error) {
      return { ok: false, kind: isStatus(error, 404) ? "not_found" : "error" };
    }
  };

  return {
    createShortUrl: async (
      longUrl: string,
      options: CreateUrlOptions = {},
    ): Promise<CreateOutcome> => {
      try {
        const response = await client.post<urlResponse>("/url", {
          longUrl,
          customAlias: options.customAlias || undefined,
          expiresAt: options.expiresAt || undefined,
          maxClicks: options.maxClicks,
        });

        return { ok: true, data: response.data };
      } catch (error) {
        const body = bodyOf(error);

        if (body?.reason) {
          return { ok: false, kind: "refused", reason: body.reason };
        }

        return { ok: false, kind: "error", error: body?.error ?? GENERIC_ERROR };
      }
    },

    checkAlias: (alias: string, signal?: AbortSignal) =>
      outcome<AliasAvailability>(() =>
        client.get(`/alias/${encodeURIComponent(alias)}/available`, { signal }),
      ),

    getLinkStats: (shortUrl: string) =>
      outcome<LinkStats>(() =>
        client.get(`/url/${encodeURIComponent(shortUrl)}/stats`),
      ),

    getBatchStats: async (shortUrls: string[]): Promise<UrlOutcome<LinkSummary[]>> => {
      if (shortUrls.length === 0) return { ok: true, data: [] };

      try {
        const response = await client.post<{ links: LinkSummary[] }>(
          "/url/batch-stats",
          { shortUrls },
        );

        return { ok: true, data: response.data.links };
      } catch {
        return { ok: false, kind: "error" };
      }
    },

    getStats: () => outcome<Stats>(() => client.get("/stats")),
  };
};

export type UrlClient = ReturnType<typeof createUrlClient>;

export const resolveApiBaseUrl = (
  viteApiUrl: string | undefined,
  isProd: boolean,
): string => {
  if (isProd) return "/api";

  const origin = viteApiUrl?.trim();
  if (!origin) return "/api";

  return `${origin.replace(/\/$/, "")}/api`;
};

export const urlApi = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_URL, import.meta.env.PROD),
});

export const urlClient = createUrlClient(urlApi);

export const {
  createShortUrl,
  checkAlias,
  getLinkStats,
  getBatchStats,
  getStats,
} = urlClient;
