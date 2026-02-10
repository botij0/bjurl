import { urlApi } from "@/api/url.api";

export const getStats = async () => {
  // TODO: handle error response.
  const response = await urlApi.get("/stats");
  return response.data;
};