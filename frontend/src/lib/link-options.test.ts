import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { EXPIRY_OPTIONS, getExpiresAt } from "./link-options";

describe("link-options", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should define a duration for every option except never", () => {
    expect(EXPIRY_OPTIONS.find((option) => option.value === "never")?.ms).toBeNull();

    const timed = EXPIRY_OPTIONS.filter((option) => option.value !== "never");
    expect(timed).toHaveLength(4);
    expect(timed.every((option) => typeof option.ms === "number")).toBe(true);
  });

  test("should return undefined for the never option", () => {
    expect(getExpiresAt("never")).toBeUndefined();
  });

  test("should add the chosen duration to now", () => {
    expect(getExpiresAt("1h")).toBe("2026-01-01T01:00:00.000Z");
    expect(getExpiresAt("24h")).toBe("2026-01-02T00:00:00.000Z");
    expect(getExpiresAt("7d")).toBe("2026-01-08T00:00:00.000Z");
    expect(getExpiresAt("30d")).toBe("2026-01-31T00:00:00.000Z");
  });
});
