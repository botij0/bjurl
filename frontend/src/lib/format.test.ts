import { describe, expect, test } from "vitest";

import { formatDateTime } from "./format";

describe("formatDateTime", () => {
  test("should render a dash for empty values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });

  test("should render a real timestamp instead of the raw input", () => {
    const formatted = formatDateTime("2026-09-01T10:00:00.000Z");

    expect(formatted).not.toBe("—");
    expect(formatted).not.toBe("2026-09-01T10:00:00.000Z");
    expect(formatted).toMatch(/2026/);
  });
});
