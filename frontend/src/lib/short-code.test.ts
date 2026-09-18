import { describe, expect, test } from "vitest";

import { getShortCode } from "./short-code";

describe("getShortCode", () => {
  test("should extract the code from a full url", () => {
    expect(getShortCode("https://bjurl.test/abc123")).toBe("abc123");
  });

  test("should ignore extra path segments", () => {
    expect(getShortCode("https://bjurl.test/abc123/stats")).toBe("abc123");
  });

  test("should handle codes without a domain", () => {
    expect(getShortCode("abc123")).toBe("abc123");
  });
});
