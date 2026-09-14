import { describe, expect, test } from "vitest";
import { urlApi } from "./url.api";

const BASE_URL = import.meta.env.VITE_API_URL;

describe("UrlApi", () => {
  test("should be configured pointing to the testing server", () => {
    expect(urlApi).toBeDefined();
    expect(BASE_URL).toBeDefined();
    expect(urlApi.defaults.baseURL).toBe(`${BASE_URL}/api`);
  });
});
