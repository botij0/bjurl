import { urlApi } from "@/api/url.api";

export const createShortUrl = async (longUrl: string) => {
  // TODO: handle error response.
  try {
    const response = await urlApi.post("/url", { longUrl });
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};