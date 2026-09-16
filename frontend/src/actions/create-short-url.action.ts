import axios from "axios";

import { urlApi } from "@/api/url.api";
import type { CreateUrlOptions } from "@/interfaces/createUrlOptions.interface";
import type { urlResponse } from "@/interfaces/urlResponse.interface";
import type { AliasReason } from "@/lib/alias";

export type CreateShortUrlResult =
  | { ok: true; data: urlResponse }
  | { ok: false; status?: number; reason: AliasReason }
  | { ok: false; status?: number; error: string };

export const createShortUrl = async (
  longUrl: string,
  options: CreateUrlOptions = {},
): Promise<CreateShortUrlResult> => {
  try {
    const response = await urlApi.post("/url", {
      longUrl,
      customAlias: options.customAlias || undefined,
      expiresAt: options.expiresAt || undefined,
      maxClicks: options.maxClicks,
    });

    if (response.status !== 201) {
      return { ok: false, error: "Something went wrong, please try again" };
    }

    return { ok: true, data: response.data };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const body = axios.isAxiosError(error)
      ? (error.response?.data as
          | { error?: string; reason?: AliasReason }
          | undefined)
      : undefined;

    if (body?.reason) {
      return { ok: false, status, reason: body.reason };
    }

    return {
      ok: false,
      status,
      error: body?.error ?? "Something went wrong, please try again",
    };
  }
};
