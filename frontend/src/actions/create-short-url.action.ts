import axios from "axios";

import { urlApi } from "@/api/url.api";
import type { CreateUrlOptions } from "@/interfaces/createUrlOptions.interface";
import type { urlResponse } from "@/interfaces/urlResponse.interface";

export type CreateShortUrlResult =
  | { ok: true; data: urlResponse }
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
    const message = axios.isAxiosError(error)
      ? (error.response?.data as { error?: string } | undefined)?.error
      : undefined;

    return {
      ok: false,
      status,
      error: message ?? "Something went wrong, please try again",
    };
  }
};
