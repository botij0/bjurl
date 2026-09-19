import { parseCorsOrigin } from "./server";

describe("parseCorsOrigin", () => {
  test("should allow every origin for wildcard", () => {
    expect(parseCorsOrigin("*")).toBe("*");
  });

  test("should trim a spaced allow-list", () => {
    expect(parseCorsOrigin("https://a.com, https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  test("should drop empty entries", () => {
    expect(parseCorsOrigin("https://a.com,, ")).toEqual(["https://a.com"]);
  });
});
